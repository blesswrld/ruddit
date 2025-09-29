import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useAppSelector } from "@/store/hooks";
import { PostFeed } from "@/components/posts/PostFeed";
import { useState } from "react";

const prisma = new PrismaClient();

const POSTS_PER_PAGE = 5;

export const getServerSideProps = (async () => {
    // Просто загружаем первую страницу "Нового" для быстрой первоначальной отрисовки.
    const posts = await prisma.post.findMany({
        take: POSTS_PER_PAGE,
        skip: 0,
        orderBy: { createdAt: "desc" },
        include: {
            author: { select: { username: true } },
            community: { select: { slug: true } },
            votes: true,
        },
    });

    return {
        props: {
            initialPosts: JSON.parse(JSON.stringify(posts)),
        },
    };
}) satisfies GetServerSideProps;

export default function HomePage({
    initialPosts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    // Состояние для текущей активной вкладки
    const [activeFeed, setActiveFeed] = useState<"subscribed" | "new">(
        "subscribed"
    );

    const FeedTabs = () => (
        <div className="mb-4 border-b">
            <nav className="-mb-px flex space-x-8">
                <button
                    onClick={() => setActiveFeed("subscribed")}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                        activeFeed === "subscribed"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                    Моя лента
                </button>
                <button
                    onClick={() => setActiveFeed("new")}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                        activeFeed === "new"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                    Новое
                </button>
            </nav>
        </div>
    );

    return (
        <div className="container mx-auto max-w-3xl py-6">
            {isAuthenticated ? (
                <FeedTabs />
            ) : (
                <h1 className="mb-4 text-2xl font-bold">Новое</h1>
            )}

            {/* Теперь мы рендерим PostFeed в зависимости от активной вкладки */}
            {isAuthenticated && activeFeed === "subscribed" && (
                // Для "Моей ленты" initialPosts пустые, React Query сам все загрузит
                <PostFeed initialPosts={[]} feedType="subscribed" />
            )}

            {/* Ленту "Новое" показываем гостям или по клику на вкладку */}
            {(!isAuthenticated || activeFeed === "new") && (
                <PostFeed initialPosts={initialPosts} feedType="new" />
            )}
        </div>
    );
}
