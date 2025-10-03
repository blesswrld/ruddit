import { PostCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentTree } from "@/components/comments/CommentTree"; // Импортируем CommentTree

const prisma = new PrismaClient();

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { postId } = context.params!;

    const post = await prisma.post.findUnique({
        where: { id: postId as string },
        include: {
            author: { select: { username: true, id: true } },
            community: {
                select: {
                    slug: true,
                    creatorId: true,
                    subscribers: { select: { userId: true } },
                },
            },
            votes: true,
        },
    });

    // Загружаем ВСЕ комменты плоским списком
    const comments = await prisma.comment.findMany({
        where: { postId: postId as string },
        include: {
            author: { select: { username: true, id: true } },
        },
        // Сортировка по дате, чтобы сохранить хронологию
        orderBy: { createdAt: "asc" },
    });

    if (!post) {
        return { notFound: true };
    }

    return {
        props: {
            post: JSON.parse(JSON.stringify(post)),
            comments: JSON.parse(JSON.stringify(comments)), // Передаем плоский список
        },
    };
};

export default function PostPage({
    post,
    comments,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    // Формируем объект с информацией о посте, который будем передавать комментариям
    const postInfo = {
        postId: post.id,
        authorId: post.author.id,
        community: {
            creatorId: post.community.creatorId,
            subscribers: post.community.subscribers,
        },
    };

    return (
        <div className="container mx-auto mt-6 max-w-3xl">
            {/* Отображаем сам пост с помощью нашего PostCard */}
            <PostCard post={post} />

            {/* Форма для нового комментария */}
            <CommentForm postId={post.id} />

            {/* Секция с комментариями */}
            <div className="mt-4 rounded-md bg-white p-4 shadow">
                <h3 className="text-lg font-semibold mb-4">
                    Комментарии ({comments.length})
                </h3>
                {comments.length > 0 ? (
                    // Используем CommentTree
                    <CommentTree comments={comments} postInfo={postInfo} />
                ) : (
                    <p className="text-gray-500">
                        Здесь пока нет комментариев.
                    </p>
                )}
            </div>
        </div>
    );
}
