import { Button } from "@/components/common/Button";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { verify } from "jsonwebtoken";
import toast from "react-hot-toast";
import { Input } from "@/components/common/Input";

const prisma = new PrismaClient();

const NAME_MAX_LENGTH = 30;
const DESC_MAX_LENGTH = 200;

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
    const [name, setName] = useState(community.name);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDelete = async () => {
        if (
            !confirm(
                `Вы уверены, что хотите безвозвратно удалить сообщество "с/${community.name}"? Все посты и комментарии будут удалены.`
            )
        ) {
            return;
        }
        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch("/api/communities/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ communityId: community.id }),
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Не удалось удалить сообщество.");
            }

            toast.success("Сообщество успешно удалено.");
            router.push("/"); // Перенаправляем на главную после удаления
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setMessage(`Ошибка: ${error.message}`);
            toast.error(`Ошибка: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        // Делаем async
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        let uploadedImageUrl = community.imageUrl;

        // Логика загрузки файла, если он был выбран
        if (file) {
            try {
                const signResponse = await fetch(
                    "/api/users/sign-yandex-upload",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: file.name,
                            contentType: file.type,
                            folder: "community_avatars", // Папка
                        }),
                    }
                );
                if (!signResponse.ok)
                    throw new Error("Не удалось получить подпись для файла.");

                const { signedUrl, publicUrl } = await signResponse.json();

                const uploadResponse = await fetch(signedUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });
                if (!uploadResponse.ok)
                    throw new Error("Не удалось загрузить файл.");

                uploadedImageUrl = publicUrl;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                setMessage(`Ошибка загрузки: ${error.message}`);
                toast.error(`Ошибка загрузки: ${error.message}`);
                setIsLoading(false);
                return;
            }
        }

        // Используем try/catch для простоты
        try {
            const response = await fetch("/api/communities/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    communityId: community.id,
                    name,
                    description,
                    imageUrl: uploadedImageUrl,
                }),
                credentials: "include",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Не удалось обновить сообщество"
                );
            }

            // Получаем обновленные данные, включая новый slug
            const updatedCommunity = await response.json();

            toast.success("Сообщество успешно обновлено!");
            // Используем новый slug для редиректа
            router.push(`/s/${updatedCommunity.slug}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setMessage(`Произошла ошибка: ${error.message}`);
            toast.error(`Произошла ошибка: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-4 text-2xl font-bold break-all">
                Настройки с/{community.name}
            </h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Загрузка аватарки */}
                <div>
                    <label className="mb-1 block text-sm font-medium">
                        Аватар сообщества
                    </label>
                    <div className="flex items-center gap-4 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={
                                file
                                    ? URL.createObjectURL(file)
                                    : community.imageUrl ||
                                      "/default-community.png"
                            }
                            alt="Аватар"
                            className="h-20 w-20 rounded-full object-cover"
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setFile(
                                    e.target.files ? e.target.files[0] : null
                                )
                            }
                            ref={fileInputRef} // Привязываем ref
                            disabled={isLoading} // Добавляем disabled
                            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                </div>

                <div>
                    <Input
                        id="community-name"
                        label="Название сообщества"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isLoading}
                        minLength={3}
                        maxLength={NAME_MAX_LENGTH}
                    />
                </div>

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
                        maxLength={DESC_MAX_LENGTH}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-0"
                        disabled={isLoading}
                    />
                    <p
                        className={`mt-1 text-right text-xs ${
                            description.length >= 200
                                ? "text-red-500"
                                : "text-gray-500"
                        }`}
                    >
                        {description.length} / 200
                    </p>
                </div>

                {message && <p className="text-sm text-green-600">{message}</p>}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={
                            isLoading ||
                            name.trim().length < 3 ||
                            name.length > 30 ||
                            description.length > 200
                        }
                        className="w-auto"
                    >
                        {isLoading ? "Сохранение..." : "Сохранить"}
                    </Button>
                </div>

                <div className="mt-8 border-t border-red-200 pt-6">
                    <h2 className="text-lg font-semibold text-red-700">
                        Опасная зона
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Удаление сообщества — необратимое действие. Все посты,
                        комментарии и подписчики будут удалены навсегда.
                    </p>
                    <div className="mt-4">
                        <Button
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="w-full h-fit bg-red-600 text-white hover:bg-red-800 disabled:bg-red-300 border-none outline-none"
                        >
                            {isLoading
                                ? "Удаление..."
                                : "Удалить это сообщество"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
