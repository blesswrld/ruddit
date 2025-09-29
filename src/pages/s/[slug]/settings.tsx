import { Button } from "@/components/common/Button";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useState } from "react";
import { verify } from "jsonwebtoken";

const prisma = new PrismaClient();

interface JwtPayload {
    userId: string;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { slug } = context.params!;
    const { token } = context.req.cookies;

    const community = await prisma.community.findUnique({
        where: { slug: slug as string },
    });

    if (!community) {
        return { notFound: true };
    }

    // Защита страницы: проверяем, что пользователь авторизован и является создателем
    if (token) {
        try {
            const { userId } = verify(
                token,
                process.env.JWT_SECRET!
            ) as JwtPayload;
            if (community.creatorId !== userId) {
                // Если пользователь не создатель, перенаправляем его на страницу сообщества
                return {
                    redirect: { destination: `/s/${slug}`, permanent: false },
                };
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // Если токен невалидный, тоже редирект
            return {
                redirect: { destination: `/s/${slug}`, permanent: false },
            };
        }
    } else {
        // Если пользователь гость, тоже редирект
        return { redirect: { destination: `/s/${slug}`, permanent: false } };
    }

    return {
        props: {
            community: JSON.parse(JSON.stringify(community)),
        },
    };
};

export default function CommunitySettingsPage({
    community,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter();
    const [description, setDescription] = useState(community.description || "");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch("/api/communities/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    communityId: community.id,
                    description,
                }),
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Failed to update community"
                );
            }

            setMessage("Сообщество успешно обновлено!");
            setTimeout(() => router.push(`/s/${community.slug}`), 1500);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setMessage(`Произошла ошибка: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-4 text-2xl font-bold">
                Настройки с/{community.name}
            </h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                    <label
                        htmlFor="community-desc"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Описание сообщества
                    </label>
                    <textarea
                        id="community-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>

                {message && <p className="text-sm text-green-600">{message}</p>}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-auto"
                    >
                        {isLoading ? "Сохранение..." : "Сохранить"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
