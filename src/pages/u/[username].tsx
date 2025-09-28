import { CommentCard } from "@/components/comments/CommentCard";
import { PostCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState } from "react";

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
    const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");

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
            <div className="rounded-md bg-white p-6 shadow">
                {/* Аватар */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={user.avatarUrl || "/default-avatar.png"} // Заглушка, если аватара нет
                    alt={`${user.username}'s avatar`}
                    className="h-24 w-24 rounded-full border-2 border-gray-200 object-cover"
                />
                <h1 className="text-3xl font-bold">{user.username}</h1>
                <p className="text-sm text-gray-500">
                    На Ruddit с {registrationDate}
                </p>
                {/* Описание */}
                {user.bio && <p className="mt-4 text-gray-700">{user.bio}</p>}
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
            </div>
        </div>
    );
}
