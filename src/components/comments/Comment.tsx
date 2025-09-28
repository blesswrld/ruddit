import { useState } from "react";
import { useRouter } from "next/router";
import { MessageSquareReply } from "lucide-react"; // Иконка ответа
import Link from "next/link";

// Определяем тип комментария, который может содержать ответы (replies)
type CommentWithReplies = {
    id: string;
    text: string;
    createdAt: string;
    author: { username: string };
    replies: CommentWithReplies[];
    postId: string;
};

type CommentProps = {
    comment: CommentWithReplies;
};

export const Comment = ({ comment }: CommentProps) => {
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
                postId: comment.postId,
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
                <div className="text-xs text-gray-500 mb-1">
                    <Link
                        href={`/u/${comment.author.username}`}
                        className="font-semibold hover:underline"
                    >
                        п/{comment.author.username}
                    </Link>{" "}
                    • {new Date(comment.createdAt).toLocaleDateString("ru-RU")}
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
                        <Comment key={reply.id} comment={reply} />
                    ))}
                </div>
            )}
        </div>
    );
};
