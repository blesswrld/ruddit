import { PostCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps } from "next";
import { CommentForm } from "@/components/comments/CommentForm";
import { Comment } from "@/components/comments/Comment";

const prisma = new PrismaClient();

// Определяем тип для поста с комментариями, голосами и т.д.
// (Используем простой подход, чтобы избежать ошибок с типами)
type PostPageProps = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: any; // Используем any временно, чтобы не бороться с типами
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { postId } = context.params!;

    const post = await prisma.post.findUnique({
        where: { id: postId as string },
        include: {
            author: { select: { username: true } },
            community: { select: { slug: true } },
            votes: true,
            comments: {
                where: {
                    replyToId: null, // Только комментарии верхнего уровня
                },
                orderBy: {
                    createdAt: "desc",
                },
                // Начинаем рекурсию
                include: {
                    author: { select: { username: true } },
                    replies: {
                        // 1. Загружаем ответы
                        orderBy: { createdAt: "asc" }, // Старые ответы выше
                        include: {
                            author: { select: { username: true } },
                            replies: {
                                // 2. Загружаем ответы на ответы
                                orderBy: { createdAt: "asc" },
                                include: {
                                    author: { select: { username: true } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!post) {
        return { notFound: true };
    }

    return {
        props: {
            post: JSON.parse(JSON.stringify(post)),
        },
    };
};

export default function PostPage({ post }: PostPageProps) {
    return (
        <div className="container mx-auto mt-6 max-w-3xl">
            {/* Отображаем сам пост с помощью нашего PostCard */}
            <PostCard post={post} />

            {/* Форма для нового комментария */}
            <CommentForm postId={post.id} />

            {/* Секция с комментариями */}
            <div className="mt-4 rounded-md bg-white p-4 shadow">
                <h3 className="text-lg font-semibold mb-4">
                    Комментарии ({post.comments.length})
                </h3>
                {post.comments.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {/* eslint-disable-next-line
                        @typescript-eslint/no-explicit-any */}
                        {post.comments.map((comment: any) => (
                            <Comment key={comment.id} comment={comment} />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">
                        Здесь пока нет комментариев.
                    </p>
                )}
            </div>
        </div>
    );
}
