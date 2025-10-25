import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { verify } from "jsonwebtoken";
import { useRouter } from "next/router";
import { ConversationList } from "@/components/chat/ConversationList";
import { MessageView } from "@/components/chat/MessageView";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import toast from "react-hot-toast";

const prisma = new PrismaClient();

interface JwtPayload {
    userId: string;
}

// ОПРЕДЕЛЯЕМ ТИП ДЛЯ ОДНОЙ БЕСЕДЫ В СПИСКЕ
type ConversationListItem = {
    id: string;
    participants: {
        id: string;
        username: string;
        avatarUrl: string | null;
    }[];
    messages: {
        text: string;
    }[];
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { token } = context.req.cookies;
    if (!token) {
        return { redirect: { destination: "/", permanent: false } };
    }

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;

        const conversations = await prisma.conversation.findMany({
            where: { participants: { some: { id: userId } } },
            orderBy: { updatedAt: "desc" },
            include: {
                participants: {
                    where: { id: { not: userId } },
                    select: { id: true, username: true, avatarUrl: true },
                },
                messages: { orderBy: { createdAt: "desc" }, take: 1 },
            },
        });

        return {
            props: { conversations: JSON.parse(JSON.stringify(conversations)) },
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return { redirect: { destination: "/", permanent: false } };
    }
};

export default function ChatPage({
    conversations,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const activeConversationId = router.query.id as string | undefined;
    const recipientId = router.query.recipientId as string | undefined;

    const activeConversation = conversations.find(
        (c: ConversationListItem) => c.id === activeConversationId
    );
    const otherParticipant = activeConversation?.participants[0];

    const handleCloseChat = () => {
        router.push("/chat", undefined, { shallow: true });
    };

    useEffect(() => {
        if (recipientId) {
            const startChat = async () => {
                try {
                    const response = await fetch("/api/chats/create-and-get", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ recipientId }),
                        credentials: "include",
                    });
                    const conversation = await response.json();
                    if (response.ok) {
                        router.replace(
                            `/chat?id=${conversation.id}`,
                            undefined,
                            { shallow: true }
                        );
                    } else {
                        throw new Error(conversation.message);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    toast.error(error.message || "Не удалось начать чат.");
                    router.replace("/chat");
                }
            };
            startChat();
        }
    }, [recipientId, router]);

    return (
        <div className="container mx-auto h-[calc(100vh-4rem)] border-x">
            <div className="flex h-full">
                <ConversationList initialConversations={conversations} />

                {activeConversationId && otherParticipant ? (
                    <MessageView
                        key={activeConversationId}
                        conversationId={activeConversationId}
                        otherParticipant={{
                            username: otherParticipant.username,
                            avatarUrl: otherParticipant.avatarUrl || null,
                        }}
                        onClose={handleCloseChat}
                    />
                ) : (
                    <main className="w-full md:w-2/3 h-full flex flex-col bg-white items-center justify-center text-gray-500 p-4 text-center">
                        {recipientId ? (
                            <Loader2 className="h-8 w-8 animate-spin" /> // Показываем лоадер, пока создается чат
                        ) : (
                            <p>
                                Выберите чат, чтобы начать общение, или начните
                                новый со страницы профиля пользователя.
                            </p>
                        )}
                    </main>
                )}
            </div>
        </div>
    );
}
