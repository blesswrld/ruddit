import { Button } from "@/components/common/Button";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { verify } from "jsonwebtoken";
import toast from "react-hot-toast";

const prisma = new PrismaClient();

interface JwtPayload {
    userId: string;
}

// Определяем тип для сообщества в списке
type CommunityForSubmit = {
    id: string;
    name: string;
    slug: string;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { token } = context.req.cookies;

    // Если гость - редирект на главную (или страницу логина)
    if (!token) {
        return { redirect: { destination: "/", permanent: false } };
    }

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // Находим сообщества, на которые пользователь подписан, ИЛИ которые он создал
        const [subscriptions, createdCommunities] = await Promise.all([
            prisma.subscription.findMany({
                where: { userId },
                select: {
                    community: { select: { id: true, name: true, slug: true } },
                },
            }),
            prisma.community.findMany({
                where: { creatorId: userId },
                select: { id: true, name: true, slug: true },
            }),
        ]);

        // Извлекаем чистый список сообществ
        const subscribedCommunities = subscriptions.map((sub) => sub.community);

        // Объединяем два списка и убираем дубликаты
        const allPostableCommunities = [
            ...subscribedCommunities,
            ...createdCommunities,
        ];
        const uniqueCommunities = Array.from(
            new Map(
                allPostableCommunities.map((item) => [item.id, item])
            ).values()
        );

        // Сортируем по имени
        uniqueCommunities.sort((a, b) => a.name.localeCompare(b.name));

        return {
            props: {
                communities: JSON.parse(JSON.stringify(uniqueCommunities)),
            },
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        // Если токен невалидный
        return { redirect: { destination: "/", permanent: false } };
    }
};

export default function GlobalSubmitPage({
    communities,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    // По умолчанию выбираем первое сообщество в списке
    const [communityId, setCommunityId] = useState(communities[0]?.id || "");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const TITLE_MAX_LENGTH = 70;
    const CONTENT_MAX_LENGTH = 5000;

    // Если пользователь не может постить ни в одно сообщество, показываем сообщение
    if (communities.length === 0) {
        return (
            <div className="container mx-auto max-w-3xl py-6 text-center">
                <h1 className="text-2xl font-bold">Невозможно создать пост</h1>
                <p className="mt-2 text-gray-600">
                    Вы должны быть участником или создателем хотя бы одного
                    сообщества, чтобы создавать посты.
                </p>
                <Link
                    href="/communities"
                    className="mt-4 inline-block text-blue-600 hover:underline"
                >
                    Найти сообщества
                </Link>
            </div>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!communityId) {
            setError("Пожалуйста, выберите сообщество.");
            toast.error("Пожалуйста, выберите сообщество.");
            return;
        }
        setIsLoading(true);
        setError(null);

        toast
            .promise(
                fetch("/api/posts/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        content,
                        communityId,
                    }),
                    credentials: "include",
                }).then(async (response) => {
                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(
                            data.message || "Не удалось создать пост"
                        );
                    }
                    return response.json();
                }),
                {
                    loading: "Публикация поста...",
                    success: () => {
                        // Ищем в массиве `communities`
                        const targetCommunity = communities.find(
                            (c: CommunityForSubmit) => c.id === communityId
                        );
                        if (targetCommunity) {
                            router.push(`/s/${targetCommunity.slug}`);
                        } else {
                            router.push("/");
                        }
                        return "Пост успешно опубликован!";
                    },
                    error: (err) => {
                        setError(err.message);
                        return `${err.message}`;
                    },
                }
            )
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="mx-auto max-w-3xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-4 text-2xl font-bold">Создать пост</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label
                        htmlFor="community-select"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Выберите сообщество
                    </label>
                    <select
                        id="community-select"
                        value={communityId}
                        onChange={(e) => setCommunityId(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {communities.map((community: any) => (
                            <option key={community.id} value={community.id}>
                                с/{community.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ИСПОЛЬЗУЕМ ОБЫЧНЫЙ INPUT + P */}
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

                {/* ИСПОЛЬЗУЕМ ОБЫЧНЫЙ TEXTAREA + P */}
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

                {error && <p className="text-red-500 text-sm">{error}</p>}

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
