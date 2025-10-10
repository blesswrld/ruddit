import { PostFeed } from "@/components/posts/PostFeed";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";

const prisma = new PrismaClient();

const POSTS_PER_PAGE = 5;

export const getServerSideProps = (async (context) => {
    // Определяем, какую ленту загружать по умолчанию
    const defaultFeed = context.req.cookies.token ? "subscribed" : "hot";

    let posts = [];

    // Для SSR загружаем только "Популярное" или "Новое", так как "Моя лента" зависит от клиента
    if (defaultFeed === "hot" || context.query.feed === "hot") {
        // React Query на клиенте запросит и покажет правильную ленту.
        posts = await prisma.post.findMany({
            take: POSTS_PER_PAGE,
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { username: true, id: true } },
                community: { select: { slug: true } },
                votes: true,
                images: true,
            },
        });
    } else {
        // Для всех остальных случаев (включая "Моя лента") - стартуем с "Нового"
        posts = await prisma.post.findMany({
            take: POSTS_PER_PAGE,
            orderBy: { createdAt: "desc" },
            include: {
                author: { select: { username: true, id: true } },
                community: { select: { slug: true } },
                votes: true,
                images: true,
            },
        });
    }

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
