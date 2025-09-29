import { PostFeed } from "@/components/posts/PostFeed";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

const prisma = new PrismaClient();

const POSTS_PER_PAGE = 5;

export const getServerSideProps = (async () => {
    // Просто загружаем первую страницу "Нового" для быстрой первоначальной отрисовки.
    const posts = await prisma.post.findMany({
        take: POSTS_PER_PAGE,
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
    return (
        <div className="container mx-auto max-w-3xl py-6">
            {/* Вся логика вкладок и загрузки находится внутри самого PostFeed. */}
            <PostFeed initialPosts={initialPosts} />
        </div>
    );
}
