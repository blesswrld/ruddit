import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { VoteClient } from "./VoteClient";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/router";
import { MoreHorizontal } from "lucide-react"; // Иконка для меню

// Создаем и ЭКСПОРТИРУЕМ тип, описывающий пост
export type PostForCard = {
    id: string;
    title: string;
    content: string | null;
    createdAt: string; // Даты после JSON.stringify становятся строками
    author: {
        username: string;
        id: string; // Нам нужен ID автора для проверки
    };

    // Добавляем голоса
    votes: {
        userId: string;
        type: "UP" | "DOWN";
    }[];

    // Добавляем поле для сообщества
    community: {
        slug: string;
    };
};

type PostCardProps = {
    post: PostForCard;
};

export const PostCard = ({ post }: PostCardProps) => {
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);
    const isAuthor = user?.id === post.author.id;

    // Состояния для режима редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content || "");
    const [editedTitle, setEditedTitle] = useState(post.title);
    const [isLoading, setIsLoading] = useState(false);

    // Состояние для меню действий (редактировать/удалить)
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const TITLE_MAX_LENGTH = 70;
    const CONTENT_MAX_LENGTH = 5000;

    // Закрытие меню по клику вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    // Обработчик для сохранения изменений
    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            await fetch("/api/posts/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Отправляем и title, и content
                body: JSON.stringify({
                    postId: post.id,
                    title: editedTitle,
                    content: editedContent,
                }),
                credentials: "include",
            });
            setIsEditing(false);
            router.replace(router.asPath); // Перезагружаем данные страницы для отображения изменений
        } catch (error) {
            console.error("Failed to update post", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчик для удаления поста
    const handleDelete = async () => {
        if (!confirm("Вы уверены, что хотите удалить этот пост?")) return;
        setIsLoading(true);
        try {
            await fetch("/api/posts/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: post.id }),
                credentials: "include",
            });
            // Если мы на странице поста, редиректим, иначе просто обновляем ленту
            if (router.pathname.includes("/post/")) {
                router.push(`/s/${post.community.slug}`);
            } else {
                router.replace(router.asPath);
            }
        } catch (error) {
            console.error("Failed to delete post", error);
        } finally {
            setIsLoading(false);
        }
    };

    const postDate = new Date(post.createdAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="flex rounded-md border border-gray-200 bg-white shadow-sm">
            {/* Вертикальный блок для голосования */}
            <div className="flex flex-col items-center p-2 bg-gray-50 rounded-l-md">
                <VoteClient initialVotes={post.votes} postId={post.id} />
            </div>

            {/* Основной контент поста */}
            <div className="flex-grow p-4">
                <div className="flex justify-between items-start">
                    <div className="mb-2 text-xs text-gray-500">
                        <span>
                            Опубликовал{" "}
                            <Link
                                href={`/u/${post.author.username}`}
                                className="font-semibold hover:underline"
                            >
                                п/{post.author.username}
                            </Link>{" "}
                            • {postDate}
                        </span>
                    </div>
                    {/* Меню действий для автора */}
                    {isAuthor && !isEditing && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-1 rounded-full hover:bg-gray-100"
                            >
                                <MoreHorizontal className="h-5 w-5 text-gray-500" />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-1 w-32 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setIsEditing(true);
                                                setIsMenuOpen(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Редактировать
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Логика отображения */}
                {isEditing ? (
                    <div className="flex flex-col gap-2">
                        {/* Добавляем счетчик для заголовка */}
                        <div>
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                maxLength={TITLE_MAX_LENGTH}
                                className="w-full rounded-md border border-gray-300 p-2 text-lg font-bold"
                            />
                            <p
                                className={`mt-1 text-right text-xs ${
                                    editedTitle.length >= TITLE_MAX_LENGTH
                                        ? "text-red-500"
                                        : "text-gray-500"
                                }`}
                            >
                                {editedTitle.length} / {TITLE_MAX_LENGTH}
                            </p>
                        </div>

                        {/* Добавляем счетчик для текста */}
                        <div>
                            <textarea
                                value={editedContent}
                                onChange={(e) =>
                                    setEditedContent(e.target.value)
                                }
                                maxLength={CONTENT_MAX_LENGTH}
                                className="w-full rounded-md border border-gray-300 p-2 text-sm"
                                rows={5}
                            />
                            <p
                                className={`mt-1 text-right text-xs ${
                                    editedContent.length >= CONTENT_MAX_LENGTH
                                        ? "text-red-500"
                                        : "text-gray-500"
                                }`}
                            >
                                {editedContent.length} / {CONTENT_MAX_LENGTH}
                            </p>
                        </div>

                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={handleUpdate}
                                // Добавляем проверку длины в disabled
                                disabled={
                                    isLoading ||
                                    editedTitle.trim().length === 0 ||
                                    editedTitle.length > TITLE_MAX_LENGTH ||
                                    editedContent.length > CONTENT_MAX_LENGTH
                                }
                                className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isLoading ? "Сохранение..." : "Сохранить"}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditedTitle(post.title);
                                    setEditedContent(post.content || "");
                                }}
                                className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <Link
                            href={`/s/${post.community.slug}/post/${post.id}`}
                        >
                            <h2 className="mb-2 text-xl break-all font-bold hover:underline">
                                {post.title}
                            </h2>
                        </Link>
                        {post.content && (
                            <p className="text-gray-700 break-all whitespace-pre-wrap">
                                {post.content}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
