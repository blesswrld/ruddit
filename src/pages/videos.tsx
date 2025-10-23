import { VideoFeed } from "@/components/posts/VideoFeed";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 5;

export const getServerSideProps = (async () => {
    const posts = await prisma.post.findMany({
        where: {
            videoUrl: { not: null },
        },
        take: POSTS_PER_PAGE,
        orderBy: { createdAt: "desc" },
        include: {
            author: { select: { username: true, id: true } },
            community: { select: { slug: true } },
            votes: true,
            images: true,
        },
    });

    return {
        props: {
            initialPosts: JSON.parse(JSON.stringify(posts)),
        },
    };
}) satisfies GetServerSideProps;

export default function VideosPage({
    initialPosts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <div className="container mx-auto max-w-3xl py-6">
            <h1 className="mb-4 text-2xl font-bold">Видеолента</h1>
            <VideoFeed initialPosts={initialPosts} />
        </div>
    );
}
