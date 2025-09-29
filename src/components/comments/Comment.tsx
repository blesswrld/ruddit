import { useState } from "react";
import { useRouter } from "next/router";
import { MessageSquareReply } from "lucide-react"; // Иконка ответа
import Link from "next/link";

// Определяем тип комментария, который может содержать ответы (replies)
type CommentWithReplies = {
    id: string;
    text: string;
    createdAt: string;
    author: { username: string; id: string };
    replies: CommentWithReplies[];
};

// Тип для информации о посте, которую мы будем "прокидывать"
type PostInfo = {
    postId: string;
    authorId: string;
    community: {
        creatorId: string;
        subscribers: { userId: string }[];
    };
};

type CommentProps = {
    comment: CommentWithReplies;
    postInfo: PostInfo; // Теперь это обязательный пропс
};

// Компонент для отображения бейджа
const RoleBadge = ({
    comment,
    postInfo,
}: {
    comment: CommentWithReplies;
    postInfo: PostInfo;
}) => {
    const authorId = comment.author.id;
    const { authorId: postAuthorId, community } = postInfo;
    const { creatorId, subscribers } = community;
    const isSubscribed = subscribers.some((sub) => sub.userId === authorId);

    if (authorId === creatorId) {
        return (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                Создатель
            </span>
        );
    }
    if (authorId === postAuthorId) {
        return (
            <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                Автор поста
            </span>
        );
    }
    if (isSubscribed) {
        return (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                Участник
            </span>
        );
    }
    return null; // Нет роли
};

export const Comment = ({ comment, postInfo }: CommentProps) => {
    const router = useRouter();
    const [replyText, setReplyText] = useState("");
    const [isReplying, setIsReplying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (replyText.trim() === "") return;
        setIsLoading(true);

        await fetch("/api/posts/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                postId: postInfo.postId, // Берем ID из postInfo
                text: replyText,
                replyToId: comment.id, // Указываем, на какой коммент отвечаем
            }),
            credentials: "include",
        });

        setIsLoading(false);
        setIsReplying(false);
        setReplyText("");
        router.replace(router.asPath);
    };

    return (
        <div className="flex flex-col">
            {/* Сам комментарий */}
            <div className="rounded-md bg-gray-50 p-3">
                <div className="flex items-center text-xs text-gray-500 mb-1">
                    <Link
                        href={`/u/${comment.author.username}`}
                        className="font-semibold hover:underline"
                    >
                        п/{comment.author.username}
                    </Link>
                    {/* Показываем роль */}
                    <RoleBadge comment={comment} postInfo={postInfo} />
                    <span className="mx-1">•</span>
                    <span>
                        {new Date(comment.createdAt).toLocaleDateString(
                            "ru-RU"
                        )}
                    </span>
                </div>
                <p className="text-gray-800">{comment.text}</p>
                <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="mt-2 flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                    <MessageSquareReply className="h-4 w-4" />
                    Ответить
                </button>
            </div>

            {/* Форма ответа (появляется по клику) */}
            {isReplying && (
                <form onSubmit={handleReplySubmit} className="ml-5 mt-2">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        rows={2}
                        placeholder={`Ответ пользователю п/${comment.author.username}`}
                        disabled={isLoading}
                    />
                    <div className="mt-1 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsReplying(false)}
                            className="text-xs font-semibold text-gray-500"
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                            {isLoading ? "..." : "Ответить"}
                        </button>
                    </div>
                </form>
            )}

            {/* Рекурсивный рендер ответов */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-5 mt-3 flex flex-col gap-3 border-l-2 border-gray-200 pl-4">
                    {comment.replies.map((reply) => (
                        // Передаем postInfo дальше вглубь
                        <Comment
                            key={reply.id}
                            comment={reply}
                            postInfo={postInfo}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
