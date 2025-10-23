import { Button } from "@/components/common/Button";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState, useRef } from "react";
import { PrismaClient } from "@prisma/client";
import toast from "react-hot-toast";
import { X, ImagePlus, Video, FileText } from "lucide-react";

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

    // Новые состояния для типов постов
    const [postType, setPostType] = useState<"text" | "image" | "video">(
        "text"
    );
    const [files, setFiles] = useState<File[]>([]);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILES = 5;
    const TITLE_MAX_LENGTH = 70;
    const CONTENT_MAX_LENGTH = 5000;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const newFiles = [...files, ...selectedFiles].slice(0, MAX_FILES);
            setFiles(newFiles);
        }
    };
    const removeImage = (indexToRemove: number) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };
    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setVideoFile(e.target.files[0]);
        }
    };
    const removeVideo = () => {
        setVideoFile(null);
        if (videoInputRef.current) videoInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            let imageUrls: string[] = [];
            let videoUrl: string | null = null;

            if (postType === "image" && files.length > 0) {
                const uploadPromises = files.map((file) =>
                    (async () => {
                        const signResponse = await fetch(
                            "/api/users/sign-yandex-upload",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    filename: file.name,
                                    contentType: file.type,
                                    folder: "post_images",
                                }),
                            }
                        );
                        if (!signResponse.ok)
                            throw new Error(
                                `Не удалось получить подпись для ${file.name}.`
                            );
                        const { signedUrl, publicUrl } =
                            await signResponse.json();
                        const uploadResponse = await fetch(signedUrl, {
                            method: "PUT",
                            body: file,
                            headers: { "Content-Type": file.type },
                        });
                        if (!uploadResponse.ok)
                            throw new Error(
                                `Не удалось загрузить ${file.name}.`
                            );
                        return publicUrl;
                    })()
                );
                imageUrls = await toast.promise(Promise.all(uploadPromises), {
                    loading: "Загрузка изображений...",
                    success: "Изображения загружены!",
                    error: "Ошибка при загрузке изображений.",
                });
            }

            if (postType === "video" && videoFile) {
                const uploadPromise = (async () => {
                    const signResponse = await fetch(
                        "/api/users/sign-yandex-upload",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                filename: videoFile.name,
                                contentType: videoFile.type,
                                folder: "post_videos",
                            }),
                        }
                    );
                    if (!signResponse.ok)
                        throw new Error(
                            "Не удалось получить подпись для видео."
                        );
                    const { signedUrl, publicUrl } = await signResponse.json();
                    const uploadResponse = await fetch(signedUrl, {
                        method: "PUT",
                        body: videoFile,
                        headers: { "Content-Type": videoFile.type },
                    });
                    if (!uploadResponse.ok)
                        throw new Error("Не удалось загрузить видео.");
                    return publicUrl;
                })();
                videoUrl = await toast.promise(uploadPromise, {
                    loading: "Загрузка видео...",
                    success: "Видео загружено!",
                    error: (err) => `Ошибка: ${err.message}`,
                });
            }

            await toast.promise(
                fetch("/api/posts/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        content: postType === "text" ? content : null,
                        communityId: community.id,
                        imageUrls,
                        videoUrl,
                    }),
                    credentials: "include",
                }).then(async (res) => {
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(
                            data.message || "Не удалось создать пост"
                        );
                    }
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
                    error: (err) => err.message,
                }
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setError(error.message);
            toast.error(`Ошибка: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-1 text-2xl font-bold break-all">
                Создать пост в с/{community.name}
            </h1>
            <hr className="mb-4" />

            <div className="mb-4 border-b">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setPostType("text")}
                        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            postType === "text"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        <FileText size={16} />
                        Текст
                    </button>
                    <button
                        onClick={() => setPostType("image")}
                        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            postType === "image"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        <ImagePlus size={16} />
                        Изображения
                    </button>
                    <button
                        onClick={() => setPostType("video")}
                        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            postType === "video"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        <Video size={16} />
                        Видео
                    </button>
                </nav>
            </div>

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
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-0"
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

                {postType === "text" && (
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
                            className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-0"
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
                )}

                {postType === "image" && (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Изображения (до {MAX_FILES})
                        </label>
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-4">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="relative aspect-square"
                                >
                                    {/* eslint-disable-next-line
                                    @next/next/no-img-element */}
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt={`Preview ${index}`}
                                        className="h-full w-full object-cover rounded-md"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {files.length < MAX_FILES && (
                                <label
                                    htmlFor="image-upload"
                                    className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-gray-400 ${
                                        isLoading
                                            ? "bg-gray-200 cursor-not-allowed"
                                            : "bg-gray-50 hover:bg-gray-100"
                                    } aspect-square`}
                                >
                                    <ImagePlus size={32} />
                                    <input
                                        id="image-upload"
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="sr-only"
                                        ref={imageInputRef}
                                        onClick={(e) => {
                                            (
                                                e.target as HTMLInputElement
                                            ).value = "";
                                        }}
                                        onChange={handleFileChange}
                                        disabled={isLoading}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                            Совет: для лучшего отображения используйте
                            горизонтальные изображения (16:9) или квадратные
                            (1:1).
                        </p>
                    </div>
                )}

                {postType === "video" && (
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                            Видеофайл
                        </label>
                        <div className="mt-2">
                            {videoFile ? (
                                <div className="relative">
                                    <video
                                        src={URL.createObjectURL(videoFile)}
                                        controls
                                        className="w-full rounded-md max-h-96"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeVideo}
                                        className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    htmlFor="video-upload"
                                    className={`flex h-48 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 text-gray-400 ${
                                        isLoading
                                            ? "bg-gray-200 cursor-not-allowed"
                                            : "bg-gray-50 hover:bg-gray-100"
                                    }`}
                                >
                                    <Video size={48} />
                                    <span className="mt-2 text-sm">
                                        Выберите видео (.mp4)
                                    </span>
                                    <input
                                        id="video-upload"
                                        type="file"
                                        accept="video/mp4"
                                        className="sr-only"
                                        onChange={handleVideoFileChange}
                                        ref={videoInputRef}
                                        disabled={isLoading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={
                            isLoading ||
                            title.trim().length === 0 ||
                            title.length > TITLE_MAX_LENGTH ||
                            (postType === "text" &&
                                content.length > CONTENT_MAX_LENGTH)
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
