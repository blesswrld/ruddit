import { PostCard, type PostForCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

const prisma = new PrismaClient();

export const getServerSideProps = (async () => {
    // 1. Получаем все посты
    const posts = await prisma.post.findMany({
        // 2. Сортируем: новые вверху
        orderBy: {
            createdAt: "desc",
        },
        // 3. Подгружаем все данные, которые нужны для PostCard
        include: {
            author: {
                select: { username: true },
            },
            community: {
                select: { slug: true },
            },
            votes: true,
        },
        // Можно добавить ограничение, например, take: 20, для пагинации в будущем
    });

    return {
        props: {
            posts: JSON.parse(JSON.stringify(posts)),
        },
    };
}) satisfies GetServerSideProps;

export default function HomePage({
    posts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <div className="container mx-auto max-w-3xl py-6">
            <h1 className="mb-4 text-2xl font-bold">Лента</h1>
            <div className="flex flex-col gap-4">
                {posts.length > 0 ? (
                    posts.map((post: PostForCard) => (
                        <PostCard key={post.id} post={post} />
                    ))
                ) : (
                    <p className="text-center text-gray-500">
                        Пока здесь нет ни одного поста. Создайте сообщество и
                        станьте первым!
                    </p>
                )}
            </div>
        </div>
    );
}
