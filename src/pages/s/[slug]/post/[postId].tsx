import { PostCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CommentForm } from "@/components/comments/CommentForm";
import { Comment } from "@/components/comments/Comment";

const prisma = new PrismaClient();

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { postId } = context.params!;

    const post = await prisma.post.findUnique({
        where: { id: postId as string },
        include: {
            author: { select: { username: true, id: true } }, // 1. Загружаем ID автора поста
            community: {
                select: {
                    slug: true,
                    creatorId: true, // 2. Загружаем ID создателя сообщества
                    subscribers: { select: { userId: true } }, // 3. Загружаем ID всех подписчиков
                },
            },
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
                    author: { select: { username: true, id: true } }, // Загружаем ID автора коммента
                    replies: {
                        // 1. Загружаем ответы
                        orderBy: { createdAt: "asc" }, // Старые ответы выше
                        include: {
                            author: { select: { username: true, id: true } },
                            replies: {
                                // 2. Загружаем ответы на ответы
                                orderBy: { createdAt: "asc" },
                                include: {
                                    author: {
                                        select: { username: true, id: true },
                                    },
                                    // Можно добавить еще один уровень вложенности, если нужно
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

export default function PostPage({
    post,
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
                    Комментарии ({post.comments.length})
                </h3>
                {post.comments.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {post.comments.map((comment: any) => (
                            // Передаем postInfo в каждый комментарий верхнего уровня
                            <Comment
                                key={comment.id}
                                comment={comment}
                                postInfo={postInfo}
                            />
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
