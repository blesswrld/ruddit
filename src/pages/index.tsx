import { PostCard, type PostForCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { verify } from "jsonwebtoken"; // Импортируем verify
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";

const prisma = new PrismaClient();

interface JwtPayload {
    userId: string;
}

export const getServerSideProps = (async (context) => {
    // Получаем feed из URL. По умолчанию - 'subscribed' для залогиненных.
    const feedType = context.query.feed || "subscribed";

    let currentUserId: string | null = null;
    const { token } = context.req.cookies;
    if (token) {
        try {
            const { userId } = verify(
                token,
                process.env.JWT_SECRET!
            ) as JwtPayload;
            currentUserId = userId;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            currentUserId = null;
        }
    }

    let posts;
    // Логика выбора постов в зависимости от feedType
    if (feedType === "new" || !currentUserId) {
        // Показываем "Новое", если выбрана эта вкладка ИЛИ если пользователь гость
        posts = await prisma.post.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { username: true } },
                community: { select: { slug: true } },
                votes: true,
            },
        });
    } else {
        // Показываем "Моя лента" (subscribed)
        const subscriptions = await prisma.subscription.findMany({
            where: { userId: currentUserId },
            select: { communityId: true },
        });
        const subscribedCommunityIds = subscriptions.map(
            (sub) => sub.communityId
        );

        posts = await prisma.post.findMany({
            where: {
                communityId: {
                    in: subscribedCommunityIds,
                },
            },
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { username: true } },
                community: { select: { slug: true } },
                votes: true,
            },
        });
    }

    return {
        props: {
            posts: JSON.parse(JSON.stringify(posts)),
            // Передаем тип ленты на клиент, чтобы подсветить нужную вкладку
            feedType: currentUserId ? feedType : "new",
        },
    };
}) satisfies GetServerSideProps;

export default function HomePage({
    posts,
    feedType,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    const FeedTabs = () => (
        <div className="mb-4 border-b">
            <nav className="-mb-px flex space-x-8">
                <Link
                    href="/"
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                        feedType === "subscribed"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                    Моя лента
                </Link>
                <Link
                    href="/?feed=new"
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                        feedType === "new"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                    Новое
                </Link>
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

            <div className="flex flex-col gap-4">
                {posts.length > 0 ? (
                    posts.map((post: PostForCard) => (
                        <PostCard key={post.id} post={post} />
                    ))
                ) : (
                    <div className="text-center text-gray-500">
                        {isAuthenticated && feedType === "subscribed" ? (
                            <>
                                <p>Ваша лента пуста.</p>
                                <p className="mt-2">
                                    <Link
                                        href="/communities"
                                        className="text-blue-600 hover:underline"
                                    >
                                        Вступите в сообщества
                                    </Link>
                                    , чтобы видеть здесь посты.
                                </p>
                            </>
                        ) : (
                            <p>Пока здесь нет ни одного поста.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
