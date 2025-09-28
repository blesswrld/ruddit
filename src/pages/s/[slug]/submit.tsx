import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Нам нужно передать ID сообщества на страницу для отправки формы
export const getServerSideProps = (async (context) => {
    const { slug } = context.params!;
    const community = await prisma.community.findUnique({
        where: { slug: slug as string },
        select: { id: true, name: true },
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
    };
};

export default function SubmitPage({ community }: SubmitPageProps) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/posts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    content,
                    communityId: community.id,
                }),
                credentials: "include", // Не забываем cookie
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }

            // Перенаправляем на страницу сообщества после успеха
            router.push(`/s/${router.query.slug}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-1 text-2xl font-bold">
                Создать пост в с/{community.name}
            </h1>
            <hr className="mb-4" />
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                    id="post-title"
                    label="Заголовок"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isLoading}
                    required
                    maxLength={300}
                />
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
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

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
