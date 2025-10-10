import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { VoteClient } from "./VoteClient";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/router";
import {
    MoreHorizontal,
    ChevronLeft,
    ChevronRight,
    X,
    ImagePlus,
} from "lucide-react";
import toast from "react-hot-toast";

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
    // Добавляем массив изображений
    images: {
        id: string;
        url: string;
    }[];
};

type PostCardProps = {
    post: PostForCard;
};

// Галерея изображений
const ImageGallery = ({ images }: { images: { url: string }[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем клик по ссылке на пост
        e.preventDefault();
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const isLastSlide = currentIndex === images.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    if (!images || images.length === 0) {
        return null;
    }

    return (
        <div className="relative w-full max-h-[512px] mt-2 rounded-md overflow-hidden bg-black">
            <div className="flex justify-center items-center h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={images[currentIndex].url}
                    alt="Post image"
                    className="max-h-[512px] object-contain"
                />
            </div>

            {/* Левая стрелка */}
            {images.length > 1 && (
                <div
                    onClick={goToPrevious}
                    className="absolute top-1/2 -translate-y-1/2 left-2 text-white cursor-pointer bg-black/30 rounded-full p-1 hover:bg-black/50"
                >
                    <ChevronLeft size={24} />
                </div>
            )}
            {/* Правая стрелка */}
            {images.length > 1 && (
                <div
                    onClick={goToNext}
                    className="absolute top-1/2 -translate-y-1/2 right-2 text-white cursor-pointer bg-black/30 rounded-full p-1 hover:bg-black/50"
                >
                    <ChevronRight size={24} />
                </div>
            )}
        </div>
    );
};

export const PostCard = ({ post }: PostCardProps) => {
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);
    const isAuthor = user?.id === post.author.id;

    // Состояния для режима редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content || "");
    const [editedTitle, setEditedTitle] = useState(post.title);

    // Новые состояния для управления изображениями в режиме редактирования
    const [imageUrls, setImageUrls] = useState(
        post.images.map((img) => img.url)
    );
    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    // Состояние для меню действий (редактировать/удалить)
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null); // Реф для инпута

    const TITLE_MAX_LENGTH = 70;
    const CONTENT_MAX_LENGTH = 5000;
    const MAX_FILES = 5;

    // Функция для сброса состояния редактирования
    const cancelEditing = () => {
        setIsEditing(false);
        setEditedTitle(post.title);
        setEditedContent(post.content || "");
        setImageUrls(post.images.map((img) => img.url));
        setFilesToUpload([]);
    };

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            const totalImages = imageUrls.length + filesToUpload.length;
            const canAdd = MAX_FILES - totalImages;
            const newFiles = selectedFiles.slice(0, canAdd);
            setFilesToUpload((prev) => [...prev, ...newFiles]);
        }
    };

    const removeExistingImage = (urlToRemove: string) => {
        setImageUrls(imageUrls.filter((url) => url !== urlToRemove));
    };

    const removeNewFile = (indexToRemove: number) => {
        setFilesToUpload(
            filesToUpload.filter((_, index) => index !== indexToRemove)
        );
    };

    // Обработчик для сохранения изменений
    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            let newUploadedUrls: string[] = [];
            if (filesToUpload.length > 0) {
                const uploadPromises = filesToUpload.map((file) =>
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

                newUploadedUrls = await toast.promise(
                    Promise.all(uploadPromises),
                    {
                        loading: "Загрузка новых изображений...",
                        success: "Новые изображения загружены!",
                        error: (err) => `Ошибка: ${err.message}`,
                    }
                );
            }

            const finalImageUrls = [...imageUrls, ...newUploadedUrls];

            await toast.promise(
                fetch("/api/posts/update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        postId: post.id,
                        title: editedTitle,
                        content: editedContent,
                        imageUrls: finalImageUrls,
                    }),
                    credentials: "include",
                }).then((res) => {
                    if (!res.ok) throw new Error("Не удалось обновить пост");
                }),
                {
                    loading: "Сохранение поста...",
                    success: "Пост успешно обновлен!",
                    error: "Ошибка при сохранении.",
                }
            );

            setIsEditing(false);
            router.replace(router.asPath);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            toast.error(error.message || "Произошла непредвиденная ошибка.");
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчик для удаления поста
    const handleDelete = () => {
        // Убираем async
        if (!confirm("Вы уверены, что хотите удалить этот пост?")) return;
        setIsLoading(true);
        toast
            .promise(
                fetch("/api/posts/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId: post.id }),
                    credentials: "include",
                }).then((res) => {
                    if (!res.ok) throw new Error("Не удалось удалить пост");
                }),
                {
                    loading: "Удаление...",
                    success: () => {
                        if (router.pathname.includes("/post/")) {
                            router.push(`/s/${post.community.slug}`);
                        } else {
                            router.replace(router.asPath);
                        }
                        return "Пост удален.";
                    },
                    error: "Ошибка при удалении.",
                }
            )
            .finally(() => {
                setIsLoading(false);
            });
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
                                <div className="absolute right-0 mt-1 w-32 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
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
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-none outline-none ring-0 focus:ring-0"
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
                    <div className="flex flex-col gap-4">
                        {/* Поле для редактирования заголовка */}
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

                        {/* Поле для редактирования текста */}
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

                        {/* Редактор изображений */}
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Изображения
                            </label>
                            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-4">
                                {imageUrls.map((url) => (
                                    <div
                                        key={url}
                                        className="relative aspect-square"
                                    >
                                        {/* eslint-disable-next-line
                                        @next/next/no-img-element */}
                                        <img
                                            src={url}
                                            alt="Existing image"
                                            className="h-full w-full object-cover rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeExistingImage(url)
                                            }
                                            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {filesToUpload.map((file, index) => (
                                    <div
                                        key={file.name + index}
                                        className="relative aspect-square"
                                    >
                                        {/* eslint-disable-next-line
                                        @next/next/no-img-element */}
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt="New preview"
                                            className="h-full w-full object-cover rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeNewFile(index)}
                                            className="absolute -top-2 -right-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {imageUrls.length + filesToUpload.length <
                                    MAX_FILES && (
                                    <label
                                        htmlFor={`image-edit-upload-${post.id}`}
                                        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-gray-300 ${
                                            isLoading
                                                ? "bg-gray-200 cursor-not-allowed"
                                                : "bg-gray-50 hover:bg-gray-100"
                                        } text-gray-400 aspect-square`}
                                    >
                                        <ImagePlus size={32} />
                                        <input
                                            id={`image-edit-upload-${post.id}`}
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="sr-only"
                                            ref={imageInputRef} // Привязываем реф
                                            onClick={(e) => {
                                                (
                                                    e.target as HTMLInputElement
                                                ).value = "";
                                            }} // Сбрасываем значение
                                            onChange={handleFileChange}
                                            disabled={isLoading}
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Подсказка */}
                            <p className="mt-2 text-xs text-gray-500">
                                Совет: для лучшего отображения используйте
                                горизонтальные изображения (16:9) или квадратные
                                (1:1).
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
                                onClick={cancelEditing}
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
                            <h2 className="mb-2 text-xl font-bold hover:underline break-all">
                                {post.title}
                            </h2>
                        </Link>
                        <ImageGallery images={post.images} />
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
