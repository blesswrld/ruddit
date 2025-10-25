"use client";

import {
    useInfiniteQuery,
    useQueryClient,
    useMutation,
    InfiniteData,
} from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Send, X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useEffect, useRef, useState } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";
import Link from "next/link";

const MESSAGES_PER_PAGE = 20;

type Message = {
    id: string;
    text: string;
    createdAt: string;
    author: { username: string; avatarUrl: string | null };
    authorId: string;
};

const fetchMessages = async ({
    pageParam = 1,
    queryKey,
}: {
    pageParam?: number;
    queryKey: (string | undefined)[];
}): Promise<Message[]> => {
    const [, conversationId] = queryKey;
    if (!conversationId) return [];
    const { data } = await axios.get(
        `/api/chats/${conversationId}?page=${pageParam}`,
        { withCredentials: true }
    );
    return data;
};

const postMessage = async ({
    conversationId,
    text,
}: {
    conversationId: string;
    text: string;
}) => {
    const { data } = await axios.post(
        `/api/chats/messages`,
        { conversationId, text },
        { withCredentials: true }
    );
    return data;
};

type MessageViewProps = {
    conversationId: string;
    otherParticipant: { username: string; avatarUrl: string | null };
    onClose: () => void;
};

export const MessageView = ({
    conversationId,
    otherParticipant,
    onClose,
}: MessageViewProps) => {
    const { user } = useAppSelector((state) => state.auth);
    const queryClient = useQueryClient();
    const [text, setText] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // ПОДКЛЮЧАЕМСЯ НАПРЯМУЮ К WEBSOCKET-СЕРВЕРУ
        const socket: Socket = io("http://localhost:3001");

        socket.on("connect", () => {
            console.log("Socket connected!");
            socket.emit("join_conversation", conversationId);
        });

        const handleNewMessage = (newMessage: Message) => {
            console.log("Received new message:", newMessage);
            queryClient.setQueryData<InfiniteData<Message[]>>(
                ["messages", conversationId],
                (oldData) => {
                    if (!oldData)
                        return { pages: [[newMessage]], pageParams: [1] };
                    const messageExists = oldData.pages
                        .flat()
                        .some((msg) => msg.id === newMessage.id);
                    if (messageExists) return oldData;
                    const newData = {
                        pages: oldData.pages.map((page) => [...page]),
                        pageParams: [...oldData.pageParams],
                    };
                    newData.pages[0].unshift(newMessage);
                    return newData;
                }
            );
        };

        socket.on("new_message", handleNewMessage);
        return () => {
            socket.disconnect();
        };
    }, [conversationId, queryClient]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
        useInfiniteQuery({
            queryKey: ["messages", conversationId],
            queryFn: fetchMessages,
            initialPageParam: 1,
            getNextPageParam: (lastPage, allPages) => {
                if (!lastPage || lastPage.length < MESSAGES_PER_PAGE)
                    return undefined;
                return allPages.length + 1;
            },
        });

    const { setTarget } = useIntersectionObserver({
        onIntersect: () => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        },
        root: chatContainerRef.current,
        rootMargin: "100px",
    });

    const mutation = useMutation({
        mutationFn: postMessage,
        onError: () => {
            toast.error("Не удалось отправить сообщение.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() === "") return;
        mutation.mutate({ conversationId, text });
        setText("");
    };

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "auto" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.pages[0]?.[0]?.id]);

    const messages = data?.pages.flatMap((page) => page) ?? [];

    return (
        <main className="w-full md:w-2/3 h-full flex flex-col bg-white">
            <div className="p-4 border-b flex items-center gap-3 flex-shrink-0">
                <Link href={`/u/${otherParticipant.username}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={
                            otherParticipant.avatarUrl || "/default-avatar.png"
                        }
                        alt="avatar"
                        className="h-10 w-10 rounded-full hover:opacity-80 transition"
                    />
                </Link>
                <Link href={`/u/${otherParticipant.username}`}>
                    <p className="font-bold hover:underline">
                        {otherParticipant.username}
                    </p>
                </Link>

                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                    <X size={20} />
                </button>
            </div>

            <div
                ref={chatContainerRef}
                className="flex-grow p-4 overflow-y-auto flex flex-col-reverse"
            >
                <div ref={messagesEndRef} />
                <div className="flex flex-col-reverse gap-4">
                    {hasNextPage && (
                        <div
                            ref={setTarget}
                            className="flex justify-center p-4"
                        >
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex items-end gap-2 w-full ${
                                message.authorId === user?.id
                                    ? "justify-end"
                                    : "justify-start"
                            }`}
                        >
                            {message.authorId !== user?.id && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={
                                        message.author.avatarUrl ||
                                        "/default-avatar.png"
                                    }
                                    alt="avatar"
                                    className="h-8 w-8 rounded-full"
                                />
                            )}
                            <div
                                className={`max-w-xs md:max-w-md p-3 rounded-lg break-words ${
                                    message.authorId === user?.id
                                        ? "bg-blue-500 text-white"
                                        : "bg-gray-200 text-gray-800"
                                }`}
                            >
                                <p>{message.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {status === "pending" && (
                    <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                )}
            </div>

            <div className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Напишите сообщение..."
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        disabled={mutation.isPending}
                    />
                    <button
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                        disabled={mutation.isPending}
                    >
                        <Send />
                    </button>
                </form>
            </div>
        </main>
    );
};
