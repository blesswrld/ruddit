import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { PrismaClient } from "@prisma/client";
import { useAppSelector } from "@/store/hooks"; // Импортируем хук Redux
import Link from "next/link"; // Импортируем Link
import { PostCard, type PostForCard } from "@/components/posts/PostCard";
import { verify } from "jsonwebtoken";
import { SubscribeToggle } from "@/components/community/SubscribeToggle";
import { Button } from "@/components/common/Button";

const prisma = new PrismaClient();

// Определяем тип для JWT, если он есть
interface JwtPayload {
    userId: string;
}

export const getServerSideProps = (async (context) => {
    const { slug } = context.params!;

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

    const community = await prisma.community.findUnique({
        where: { slug: slug as string },
        include: {
            creator: { select: { username: true } },
            _count: {
                select: { subscribers: true },
            },
            // Загружаем `subscribers` целиком, а не только _count
            subscribers: {
                where: {
                    userId: currentUserId ?? undefined,
                },
                select: { userId: true }, // Загружаем только ID для проверки
            },
            posts: {
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { username: true, id: true } },
                    votes: true,
                    images: true,
                    community: { select: { slug: true } },
                },
            },
        },
    });

    if (!community) {
        return { notFound: true };
    }

    const isSubscribed = community.subscribers.length > 0;

    // Является ли текущий пользователь создателем?
    const isCreator = community.creatorId === currentUserId;

    return {
        props: {
            community: JSON.parse(JSON.stringify(community)),
            isSubscribed: isSubscribed,
            subscriberCount: community._count.subscribers,
            isCreator: isCreator, // Передаем флаг
        },
    };
}) satisfies GetServerSideProps;

export default function CommunityPage({
    community,
    isSubscribed,
    subscriberCount, // Пока не используем, но в будущем пригодится
    isCreator, // Получаем пропс
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    // Получаем статус аутентификации из Redux
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    return (
        <div>
            {/* Шапка сообщества */}
            <div className="bg-white">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Аватар */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={
                                    community.imageUrl ||
                                    "/default-community.png"
                                }
                                alt="Аватар"
                                className="h-16 w-16 rounded-full"
                            />
                            <div>
                                <h1 className="text-3xl font-bold break-all">
                                    {community.name}
                                </h1>
                                <p className="text-gray-500">
                                    с/{community.slug}
                                </p>
                            </div>
                        </div>

                        {isAuthenticated && (
                            <SubscribeToggle
                                initialIsSubscribed={isSubscribed}
                                communityId={community.id}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Основной контент */}
            <div className="container mx-auto mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Лента постов */}
                <div className="flex flex-col gap-4 md:col-span-2">
                    {isAuthenticated && (
                        <div className="mb-4 rounded-md bg-white p-4 shadow">
                            <Link
                                href={`/s/${community.slug}/submit`}
                                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-left text-gray-600 hover:bg-gray-100 "
                            >
                                Создать пост
                            </Link>
                        </div>
                    )}
                    {/* Отображаем посты */}
                    {community.posts.length > 0 ? (
                        community.posts.map((post: PostForCard) => (
                            <PostCard key={post.id} post={post} />
                        ))
                    ) : (
                        <div className="rounded-md bg-white p-4 text-center text-gray-500 shadow">
                            В этом сообществе еще нет постов. Станьте первым!
                        </div>
                    )}
                </div>

                {/* Сайдбар с информацией */}
                <div className="md:col-span-1">
                    <div className="rounded-md bg-white p-4 shadow">
                        <h2 className="mb-2 border-b pb-2 font-bold">
                            О сообществе
                        </h2>
                        <p className="text-sm text-gray-700 break-all">
                            {community.description || "Нет описания."}
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                            <p>
                                Создано:{" "}
                                {new Date(
                                    community.createdAt
                                ).toLocaleDateString("ru-RU")}
                            </p>
                            <p>
                                Создатель:{" "}
                                <Link
                                    href={`/u/${community.creator.username}`}
                                    className="font-semibold hover:underline"
                                >
                                    п/{community.creator.username}
                                </Link>
                            </p>
                            <p className="break-all">
                                Подписчиков: {subscriberCount}
                            </p>

                            {/* Кнопка настроек для создателя */}
                            {isCreator && (
                                <div className="mt-4 border-t pt-4">
                                    <Link
                                        href={`/s/${community.slug}/settings`}
                                    >
                                        <Button
                                            className="w-full border-none outline-none"
                                            variant="primary"
                                        >
                                            Настройки сообщества
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
