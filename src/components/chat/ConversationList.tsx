"use client";

import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";

// Тип для одной беседы, как она приходит с API
type Conversation = {
    id: string;
    updatedAt: string;
    participants: {
        id: string;
        username: string;
        avatarUrl: string | null;
    }[];
    messages: {
        text: string;
        createdAt: string;
    }[];
};

// Функция для получения списка чатов
const fetchConversations = async (): Promise<Conversation[]> => {
    const { data } = await axios.get("/api/chats", { withCredentials: true });
    return data;
};

type ConversationListProps = {
    initialConversations: Conversation[];
};

export const ConversationList = ({
    initialConversations,
}: ConversationListProps) => {
    const router = useRouter();
    const activeConversationId = router.query.id as string | undefined;
    const queryClient = useQueryClient();
    const socket = useSocket(
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    );

    // Используем React Query для кеширования и фонового обновления
    const { data: conversations, isLoading } = useQuery({
        queryKey: ["conversations"],
        queryFn: fetchConversations,
        initialData: initialConversations,
        refetchOnWindowFocus: true,
    });

    // useEffect для слушания WebSocket событий
    useEffect(() => {
        if (!socket) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleNewMessageInList = (newMessage: any) => {
            queryClient.setQueryData<Conversation[]>(
                ["conversations"],
                (oldData) => {
                    if (!oldData) return [];

                    const updatedList = oldData.map((convo) => {
                        if (convo.id === newMessage.conversationId) {
                            return {
                                ...convo,
                                messages: [newMessage],
                                updatedAt: newMessage.createdAt,
                            };
                        }
                        return convo;
                    });

                    return updatedList.sort(
                        (a, b) =>
                            new Date(b.updatedAt).getTime() -
                            new Date(a.updatedAt).getTime()
                    );
                }
            );
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        const handleNewConversation = (newConvo: any) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
        };

        socket.on("new_message", handleNewMessageInList);
        socket.on("new_conversation", handleNewConversation);

        return () => {
            socket.off("new_message", handleNewMessageInList);
            socket.off("new_conversation", handleNewConversation);
        };
    }, [socket, queryClient]);

    const handleSelectConversation = (conversationId: string) => {
        router.push(`/chat?id=${conversationId}`, undefined, { shallow: true });
    };

    return (
        <aside className="w-full md:w-1/3 h-full border-r overflow-y-auto">
            <div className="p-4 border-b">
                <h1 className="text-xl font-bold">Чаты</h1>
            </div>
            <div className="flex flex-col">
                {isLoading && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                )}
                {!isLoading && conversations && conversations.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-500">
                        У вас пока нет чатов. Начните общение со страницы
                        профиля пользователя.
                    </p>
                )}
                {conversations?.map((convo) => {
                    const otherParticipant = convo.participants[0];
                    if (!otherParticipant) return null;

                    return (
                        <button
                            key={convo.id}
                            onClick={() => handleSelectConversation(convo.id)}
                            className={`w-full text-left p-3 flex items-center gap-3 ${
                                activeConversationId === convo.id
                                    ? "bg-blue-50 border-r-4 border-blue-500"
                                    : "hover:bg-gray-50"
                            }`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={
                                    otherParticipant.avatarUrl ||
                                    "/default-avatar.png"
                                }
                                alt="avatar"
                                className="h-12 w-12 rounded-full flex-shrink-0"
                            />
                            <div className="flex-grow overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold truncate">
                                        {otherParticipant.username}
                                    </p>
                                    <p className="text-xs text-gray-400 flex-shrink-0">
                                        {new Date(
                                            convo.messages[0]?.createdAt ||
                                                convo.updatedAt
                                        ).toLocaleTimeString("ru-RU", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                    {convo.messages[0]?.text || "Нет сообщений"}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
};
