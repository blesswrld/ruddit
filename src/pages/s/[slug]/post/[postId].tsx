import { PostCard } from "@/components/posts/PostCard";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CommentForm } from "@/components/comments/CommentForm";
import { Comment } from "@/components/comments/Comment";
import { useRouter } from "next/router";
import { useEffect } from "react"; // 1. Импортируем useEffect

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

    // Загружаем все комментарии плоским списком
    const comments = await prisma.comment.findMany({
        where: { postId: postId as string },
        orderBy: { createdAt: "asc" },
        include: {
            author: { select: { username: true, id: true } },
            replyTo: {
                select: {
                    text: true,
                    author: {
                        select: { username: true },
                    },
                },
            },
        },
    });

    const commentsCount = comments.length;

    if (!post) {
        return { notFound: true };
    }

    return {
        props: {
            post: JSON.parse(JSON.stringify(post)),
            comments: JSON.parse(JSON.stringify(comments)),
            commentsCount,
        },
    };
};

// Определяем тип для комментария в плоском списке
type FlatComment = {
    id: string;
    replyToId: string | null;
};

export default function PostPage({
    post,
    comments,
    commentsCount,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();

    // 2. Добавляем логику скролла и подсветки
    useEffect(() => {
        const hash = router.asPath.split("#")[1];
        if (hash && hash.startsWith("comment-")) {
            const targetCommentId = hash;
            const targetElement = document.getElementById(targetCommentId);

            if (targetElement) {
                // Используем наш тип здесь
                const parentCommentId = (comments as FlatComment[]).find(
                    (c) => c.id === targetCommentId.replace("comment-", "")
                )?.replyToId;
                const parentElement = parentCommentId
                    ? document.getElementById(`comment-${parentCommentId}`)
                    : null;

                setTimeout(() => {
                    // Скроллим к целевому комментарию
                    targetElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });

                    // Подсвечиваем целевой комментарий (яркий)
                    targetElement.classList.add("highlight-comment");

                    // Если есть родитель, подсвечиваем его (тусклый)
                    if (parentElement) {
                        parentElement.classList.add("highlight-parent-comment");
                    }

                    // Убираем подсветку через 3 секунды
                    setTimeout(() => {
                        targetElement.classList.remove("highlight-comment");
                        if (parentElement) {
                            parentElement.classList.remove(
                                "highlight-parent-comment"
                            );
                        }
                    }, 3000);
                }, 100);
            }
        }
    }, [router.asPath, comments]); // Добавляем comments в зависимости

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

            <div
                id="comments-section"
                className="mt-4 rounded-md bg-white p-4 shadow"
            >
                <h3 className="text-lg font-semibold mb-4">
                    Комментарии ({commentsCount})
                </h3>
                {comments.length > 0 ? (
                    <div className="flex flex-col gap-4">
                        {/* eslint-disable-next-line
                        @typescript-eslint/no-explicit-any */}
                        {comments.map((comment: any) => (
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
