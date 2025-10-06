import { CommentCard } from "@/components/comments/CommentCard";
import { PostCard } from "@/components/posts/PostCard";
import { CustomAudioPlayer } from "@/components/common/CustomAudioPlayer";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState } from "react";
import Link from "next/link";

import {
    Instagram,
    Send,
    Youtube,
    Link as LinkIcon,
    Music2,
} from "lucide-react";

const prisma = new PrismaClient();

export const getServerSideProps = (async (context) => {
    const { username } = context.params!;

    const user = await prisma.user.findUnique({
        where: { username: username as string },
        include: {
            posts: {
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { username: true } },
                    community: { select: { slug: true } },
                    votes: true,
                },
            },
            comments: {
                orderBy: { createdAt: "desc" },
                include: {
                    post: {
                        select: {
                            id: true,
                            title: true,
                            community: { select: { slug: true } },
                        },
                    },
                },
            },
            createdCommunities: {
                orderBy: { createdAt: "desc" },
                include: {
                    _count: { select: { subscribers: true } },
                },
            },
        },
    });

    if (!user) {
        return { notFound: true };
    }

    // Убираем хеш пароля перед отправкой на клиент
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    return {
        props: {
            user: JSON.parse(JSON.stringify(userWithoutPassword)),
        },
    };
}) satisfies GetServerSideProps;

export default function UserProfilePage({
    user,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const [activeTab, setActiveTab] = useState<
        "posts" | "comments" | "communities"
    >("posts");

    const registrationDate = new Date(user.createdAt).toLocaleDateString(
        "ru-RU",
        {
            month: "long",
            year: "numeric",
        }
    );

    return (
        <div className="container mx-auto max-w-4xl py-6">
            {/* Информация о пользователе */}
            <div className="flex items-start gap-6 rounded-md bg-white p-6 shadow">
                {/* Аватар */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={user.avatarUrl || "/default-avatar.png"} // Заглушка, если аватара нет
                    alt={`${user.username}'s avatar`}
                    className="h-24 w-24 rounded-full border-2 border-gray-200 object-cover"
                />
                <div>
                    <h1 className="text-3xl font-bold">{user.username}</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        На Ruddit с {registrationDate}
                    </p>
                    {/* Описание */}
                    {user.bio && (
                        <p className="mt-4 text-gray-700">{user.bio}</p>
                    )}

                    <div className="mt-6 flex items-center gap-4 border-t pt-4">
                        {user.linkTelegram && (
                            <a
                                href={user.linkTelegram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-blue-500"
                                title="Telegram"
                            >
                                <Send className="w-auto h-5" />
                            </a>
                        )}
                        {user.linkInstagram && (
                            <a
                                href={user.linkInstagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-pink-500"
                                title="Instagram"
                            >
                                <Instagram className="w-auto h-5" />
                            </a>
                        )}
                        {user.linkYouTube && (
                            <a
                                href={user.linkYouTube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-red-600"
                                title="YouTube"
                            >
                                <Youtube className="w-auto h-5" />
                            </a>
                        )}
                        {user.linkTikTok && (
                            <a
                                href={user.linkTikTok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-black"
                                title="TikTok"
                            >
                                <Music2 className="w-auto h-5" />
                            </a>
                        )}
                        {user.linkCustomUrl && user.linkCustomName && (
                            <a
                                href={user.linkCustomUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                            >
                                <LinkIcon size={16} /> {user.linkCustomName}
                            </a>
                        )}
                    </div>

                    {/* Аудиоплеер */}
                    {user.profileMusicUrl && (
                        <div className="mt-6 border-t pt-4">
                            {/* Передаем название трека в плеер */}
                            <CustomAudioPlayer
                                src={user.profileMusicUrl}
                                trackName={
                                    user.profileMusicUrl
                                        .split("/")
                                        .pop()
                                        ?.split("-")
                                        .slice(1)
                                        .join(" ")
                                        .replace(".mp3", "") ||
                                    "Трек без названия"
                                }
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Переключатель вкладок */}
            <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === "posts"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Посты ({user.posts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("comments")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === "comments"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Комментарии ({user.comments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("communities")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === "communities"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Созданные сообщества ({user.createdCommunities.length})
                    </button>
                </nav>
            </div>

            {/* Контент вкладок */}
            <div className="mt-4 flex flex-col gap-4">
                {activeTab === "posts" && (
                    <>
                        {user.posts.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            user.posts.map((post: any) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500">
                                У пользователя еще нет постов.
                            </p>
                        )}
                    </>
                )}
                {activeTab === "comments" && (
                    <>
                        {user.comments.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            user.comments.map((comment: any) => (
                                <CommentCard
                                    key={comment.id}
                                    comment={comment}
                                />
                            ))
                        ) : (
                            <p className="text-center text-gray-500">
                                У пользователя еще нет комментариев.
                            </p>
                        )}
                    </>
                )}
                {activeTab === "communities" && (
                    <>
                        {user.createdCommunities.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            user.createdCommunities.map((community: any) => (
                                <Link
                                    key={community.id}
                                    href={`/s/${community.slug}`}
                                    className="block rounded-lg border bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
                                >
                                    <h3 className="font-bold text-lg">
                                        с/{community.name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {community.description}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {community._count.subscribers}{" "}
                                        подписчиков
                                    </p>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">
                                Пользователь еще не создал ни одного сообщества.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
