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

export default function PostPage({
    post,
    comments,
    commentsCount,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
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
