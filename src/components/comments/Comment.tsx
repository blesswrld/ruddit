import { useState } from "react";
import { useRouter } from "next/router";
import { MessageSquareReply } from "lucide-react"; // Иконка ответа
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import toast from "react-hot-toast";

// Тип для комментария из плоского списка
type CommentData = {
    id: string;
    text: string;
    createdAt: string;
    author: { username: string; id: string };
    replyToId: string | null; // ID родительского коммента
    // Содержит инфу о родительском комменте, если это ответ
    replyTo: {
        text: string;
        author: {
            username: string;
        };
    } | null;
};

export type PostInfo = {
    postId: string;
    authorId: string;
    community: {
        creatorId: string;
        subscribers: { userId: string }[];
    };
};

type CommentProps = {
    comment: CommentData;
    postInfo: PostInfo;
};

// Компонент для отображения бейджа
const RoleBadge = ({
    comment,
    postInfo,
}: {
    comment: CommentData;
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
    const { user } = useAppSelector((state) => state.auth);
    const isAuthor = user?.id === comment.author.id;

    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(comment.text);
    const [isLoading, setIsLoading] = useState(false);

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (replyText.trim() === "") return;
        setIsLoading(true);

        await fetch("/api/posts/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                postId: postInfo.postId,
                text: replyText,
                replyToId: comment.id,
            }),
            credentials: "include",
        });

        setIsLoading(false);
        setIsReplying(false);
        setReplyText("");
        router.replace(router.asPath);
    };

    const handleUpdate = async () => {
        setIsLoading(true);
        await fetch("/api/posts/comments/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commentId: comment.id, text: editedText }),
            credentials: "include",
        });

        toast.success("Комментарий успешно обновлен!");

        setIsLoading(false);
        setIsEditing(false);
        router.replace(router.asPath);
    };

    const handleDelete = async () => {
        if (!confirm("Вы уверены, что хотите удалить этот комментарий?"))
            return;
        setIsLoading(true);
        const response = await fetch("/api/posts/comments/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commentId: comment.id }),
            credentials: "include",
        });
        if (!response.ok) {
            const data = await response.json();
            toast.error(data.message || "Ошибка при удалении.");
            setIsLoading(false);
        } else {
            toast.success("Комментарий удален.");
            router.replace(router.asPath);
        }
    };

    // Функция для плавного скролла к комментарию
    const scrollToComment = (commentId: string) => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // Добавляем легкую подсветку для наглядности
            element.classList.add(
                "bg-blue-50",
                "transition-colors",
                "duration-1000"
            );
            setTimeout(() => {
                element.classList.remove("bg-blue-50");
            }, 1000);
        }
    };

    return (
        <div id={`comment-${comment.id}`} className="flex flex-col">
            {comment.replyTo && (
                <div
                    onClick={() => scrollToComment(comment.replyToId!)} // Скролл по клику
                    className="mb-1 cursor-pointer rounded-t-md border border-b-0 border-gray-200 bg-gray-100 p-2 text-xs text-gray-600 hover:bg-gray-200"
                >
                    <span className="font-semibold">
                        Ответ п/{comment.replyTo.author.username}:
                    </span>
                    <p className="truncate italic">
                        &quot;{comment.replyTo.text}&quot;
                    </p>
                </div>
            )}

            <div
                className={`p-3 ${
                    comment.replyTo
                        ? "rounded-b-md bg-white border border-gray-200"
                        : "rounded-md bg-gray-50"
                }`}
            >
                <div className="flex items-start justify-between">
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
                    {isAuthor && !isEditing && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-xs font-semibold text-gray-600 hover:text-blue-600"
                            >
                                Редактировать
                            </button>
                            <button
                                onClick={handleDelete}
                                className="text-xs font-semibold text-gray-600 hover:text-red-600"
                            >
                                Удалить
                            </button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-2">
                        <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full rounded-md border border-gray-300 p-2 text-sm"
                            rows={3}
                        />
                        <div className="mt-1 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-xs font-semibold text-gray-500"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={isLoading || editedText.trim() === ""}
                                className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
                            >
                                {isLoading ? "..." : "Сохранить"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-800 whitespace-pre-wrap break-all">
                        {comment.text}
                    </p>
                )}

                {!isEditing && (
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900"
                    >
                        <MessageSquareReply className="h-4 w-4" />
                        Ответить
                    </button>
                )}
            </div>

            {/* Форма ответа (появляется по клику) */}
            {isReplying && (
                <form onSubmit={handleReplySubmit} className="mt-2">
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
        </div>
    );
};
