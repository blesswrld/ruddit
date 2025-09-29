import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { verify } from "jsonwebtoken";

const prisma = new PrismaClient();

interface JwtPayload {
    userId: string;
}

// 1. Определяем тип для сообщества в списке
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

        // Находим сообщества, на которые пользователь подписан, чтобы он мог выбрать
        const subscriptions = await prisma.subscription.findMany({
            where: { userId },
            select: {
                community: {
                    select: { id: true, name: true, slug: true },
                },
            },
            orderBy: { community: { name: "asc" } },
        });

        // Извлекаем чистый список сообществ
        const communities = subscriptions.map((sub) => sub.community);

        return {
            props: {
                communities: JSON.parse(JSON.stringify(communities)),
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

    // Если пользователь не подписан ни на одно сообщество, показываем сообщение
    if (communities.length === 0) {
        return (
            <div className="container mx-auto max-w-3xl py-6 text-center">
                <h1 className="text-2xl font-bold">Невозможно создать пост</h1>
                <p className="mt-2 text-gray-600">
                    Вы должны быть участником хотя бы одного сообщества, чтобы
                    создавать посты.
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!communityId) {
            setError("Пожалуйста, выберите сообщество.");
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/posts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    content,
                    communityId,
                }),
                credentials: "include",
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Не удалось создать пост");
            }

            // Находим слаг сообщества, чтобы сделать правильный редирект
            // 2. Явно указываем тип для 'c'
            const community = communities.find(
                (c: CommunityForSubmit) => c.id === communityId
            );
            if (community) {
                router.push(`/s/${community.slug}`);
            } else {
                router.push("/"); // На всякий случай, если что-то пошло не так
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
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
                <Input
                    id="post-title"
                    label="Заголовок"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={10}
                    placeholder="Текст (необязательно)"
                    className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-auto"
                    >
                        {isLoading ? "Публикация..." : "Опубликовать"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
