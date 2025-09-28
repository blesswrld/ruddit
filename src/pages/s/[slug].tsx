import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { PrismaClient } from "@prisma/client";
import { useAppSelector } from "@/store/hooks"; // Импортируем хук Redux
import Link from "next/link"; // Импортируем Link
import { PostCard, type PostForCard } from "@/components/posts/PostCard";

const prisma = new PrismaClient();

export const getServerSideProps = (async (context) => {
    const { slug } = context.params!;

    const community = await prisma.community.findUnique({
        where: { slug: slug as string },
        include: {
            creator: { select: { username: true } },
            posts: {
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { username: true } },
                    votes: true,
                    community: { select: { slug: true } },
                },
            },
        },
    });

    if (!community) {
        return { notFound: true };
    }

    return {
        props: {
            community: JSON.parse(JSON.stringify(community)),
        },
    };
}) satisfies GetServerSideProps;

export default function CommunityPage({
    community,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    // Получаем статус аутентификации из Redux
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    return (
        <div>
            {/* Шапка сообщества */}
            <div className="bg-white">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold">{community.name}</h1>
                    <p className="text-gray-500">с/{community.slug}</p>
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
                                className="block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-left text-gray-600 hover:bg-gray-100"
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
                        <p className="text-sm text-gray-700">
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
