import { Button } from "@/components/common/Button";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { PrismaClient } from "@prisma/client";
import toast from "react-hot-toast";

const prisma = new PrismaClient();

// Нам нужно передать ID и имя сообщества на страницу
export const getServerSideProps = (async (context) => {
    const { slug } = context.params!;
    const community = await prisma.community.findUnique({
        where: { slug: slug as string },
        select: { id: true, name: true, slug: true }, // Добавим slug для редиректа
    });

    if (!community) {
        return { notFound: true };
    }
    return { props: { community } };
}) satisfies GetServerSideProps;

type SubmitPageProps = {
    community: {
        id: string;
        name: string;
        slug: string;
    };
};

export default function CommunitySubmitPage({ community }: SubmitPageProps) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const TITLE_MAX_LENGTH = 70;
    const CONTENT_MAX_LENGTH = 5000;

    const handleSubmit = (e: React.FormEvent) => {
        // Убираем async, toast.promise сам асинхронный
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        toast
            .promise(
                // Сам Promise, который выполняет запрос
                fetch("/api/posts/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        content,
                        communityId: community.id, // Используем `community` из props
                    }),
                    credentials: "include",
                }).then(async (response) => {
                    // Внутри then мы проверяем ответ
                    if (!response.ok) {
                        const data = await response.json();
                        // Если ошибка, мы "выбрасываем" ее, чтобы toast поймал в `error`
                        throw new Error(
                            data.message || "Не удалось создать пост"
                        );
                    }
                    // Если все ок, возвращаем данные для `success`
                    return response.json();
                }),
                // Объект с сообщениями для каждого состояния
                {
                    loading: "Публикация поста...",
                    success: () => {
                        // Действие при успехе
                        // Используем `community.slug` из props, он всегда здесь есть
                        router.push(`/s/${community.slug}`);
                        return "Пост успешно опубликован!"; // Сообщение для тоста
                    },
                    error: (err) => {
                        // Действие при ошибке
                        setError(err.message); // Показываем ошибку под формой
                        return `Ошибка: ${err.message}`; // Сообщение для тоста
                    },
                }
            )
            .finally(() => {
                // Выполнится в любом случае
                setIsLoading(false);
            });
    };

    return (
        <div className="mx-auto max-w-3xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-1 text-2xl font-bold">
                Создать пост в с/{community.name}
            </h1>
            <hr className="mb-4" />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Заголовок с счетчиком */}
                <div>
                    <label
                        htmlFor="post-title"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Заголовок
                    </label>
                    <input
                        id="post-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        maxLength={TITLE_MAX_LENGTH}
                        disabled={isLoading}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p
                        className={`mt-1 text-right text-xs ${
                            title.length >= TITLE_MAX_LENGTH
                                ? "text-red-500"
                                : "text-gray-500"
                        }`}
                    >
                        {title.length} / {TITLE_MAX_LENGTH}
                    </p>
                </div>

                {/* Текст с счетчиком */}
                <div>
                    <label
                        htmlFor="post-content"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Текст (необязательно)
                    </label>
                    <textarea
                        id="post-content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={isLoading}
                        rows={10}
                        maxLength={CONTENT_MAX_LENGTH}
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p
                        className={`mt-1 text-right text-xs ${
                            content.length >= CONTENT_MAX_LENGTH
                                ? "text-red-500"
                                : "text-gray-500"
                        }`}
                    >
                        {content.length} / {CONTENT_MAX_LENGTH}
                    </p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={
                            isLoading ||
                            title.trim().length === 0 ||
                            title.length > TITLE_MAX_LENGTH ||
                            content.length > CONTENT_MAX_LENGTH
                        }
                        className="w-auto"
                    >
                        {isLoading ? "Публикация..." : "Опубликовать"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
