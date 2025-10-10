import { CommentCard } from "@/components/comments/CommentCard";
import { PostCard } from "@/components/posts/PostCard";
import { CustomAudioPlayer } from "@/components/common/CustomAudioPlayer";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState, useCallback } from "react";
import Link from "next/link";
import { ShareButton } from "@/components/common/ShareButton";
import { useAppSelector } from "@/store/hooks";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { updateUserProfile } from "@/store/slices/authSlice";
import {
    Instagram,
    Send,
    Youtube,
    Link as LinkIcon,
    Music2,
    Palette,
    X,
} from "lucide-react";

const prisma = new PrismaClient();

const BANNER_COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#0a0a0a",
    "#6366F1",
    "#14B8A6",
    "#F97316",
    "#DC2626",
    "#7C3AED",
    "#D946EF",
    "#18181b",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function (...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export const getServerSideProps = (async (context) => {
    const { username } = context.params!;

    const user = await prisma.user.findUnique({
        where: { username: username as string },
        include: {
            posts: {
                orderBy: { createdAt: "desc" },
                include: {
                    author: { select: { username: true, id: true } },
                    community: { select: { slug: true } },
                    votes: true,
                    images: true,
                },
            },
            comments: {
                orderBy: { createdAt: "desc" },
                include: {
                    post: {
                        select: {
                            id: true,
                            title: true,
                            community: { select: { slug: true } },
                        },
                    },
                },
            },
            createdCommunities: {
                orderBy: { createdAt: "desc" },
                include: {
                    _count: { select: { subscribers: true } },
                },
            },
        },
    });

    if (!user) {
        return { notFound: true };
    }

    // Убираем хеш пароля перед отправкой на клиент
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    return {
        props: {
            user: JSON.parse(JSON.stringify(userWithoutPassword)),
        },
    };
}) satisfies GetServerSideProps;

export default function UserProfilePage({
    user: initialUser,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const dispatch = useDispatch();
    const { user: currentUser } = useAppSelector((state) => state.auth);
    const isOwnProfile = currentUser?.username === initialUser.username;

    const [activeTab, setActiveTab] = useState<
        "posts" | "comments" | "communities"
    >("posts");
    const [bannerColor, setBannerColor] = useState(
        initialUser.profileBannerColor || ""
    );
    const [isPickerVisible, setIsPickerVisible] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSave = useCallback(
        debounce((newColor: string) => {
            toast.promise(
                fetch("/api/users/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileBannerColor: newColor }),
                    credentials: "include",
                }).then((res) => {
                    if (!res.ok) throw new Error("Не удалось сохранить цвет.");
                    return res.json();
                }),
                {
                    loading: "Сохранение...",
                    success: (updatedUser) => {
                        dispatch(
                            updateUserProfile({
                                profileBannerColor:
                                    updatedUser.profileBannerColor,
                            })
                        );
                        return "Цвет профиля сохранен!";
                    },
                    error: (err) => err.message,
                }
            );
        }, 1000),
        [dispatch]
    );

    const handleColorChange = (newColor: string) => {
        setBannerColor(newColor);
        debouncedSave(newColor);
    };

    const registrationDate = new Date(initialUser.createdAt).toLocaleDateString(
        "ru-RU",
        {
            month: "long",
            year: "numeric",
        }
    );

    return (
        <div className="container mx-auto max-w-4xl py-6">
            {/* Информация о пользователе */}
            <div
                className="relative flex items-start gap-6 rounded-md p-6 shadow transition-colors"
                style={{ backgroundColor: bannerColor || "white" }}
            >
                {/* Кнопки "Поделиться" и "Изменить цвет" */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    {isOwnProfile && (
                        <div className="relative">
                            <button
                                onClick={() =>
                                    setIsPickerVisible(!isPickerVisible)
                                }
                                title="Изменить цвет профиля"
                                className={`rounded-full p-2 ${
                                    bannerColor
                                        ? "bg-black/20 text-white hover:bg-black/30"
                                        : "bg-gray-100 hover:bg-gray-200"
                                }`}
                            >
                                <Palette size={16} />
                            </button>
                            {isPickerVisible && (
                                <div className="absolute w-72 top-full right-0 mt-2 rounded-lg bg-white p-3 shadow-lg z-10">
                                    {/* Сетка с цветами */}
                                    <div className="grid grid-cols-7 gap-2">
                                        {BANNER_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() =>
                                                    handleColorChange(color)
                                                }
                                                className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                                                    bannerColor === color
                                                        ? "ring-2 ring-offset-2 ring-blue-500"
                                                        : ""
                                                }`}
                                                style={{
                                                    backgroundColor: color,
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* Кнопка "Сбросить" */}
                                    <button
                                        onClick={() => handleColorChange("")} // Передаем пустую строку для сброса
                                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-md bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                                    >
                                        <X size={14} />
                                        Сбросить цвет
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <ShareButton />
                </div>

                {/* Аватар */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={initialUser.avatarUrl || "/default-avatar.png"}
                    alt={`${initialUser.username}'s avatar`}
                    className="h-24 w-24 rounded-full border-2 border-gray-200 object-cover"
                />
                <div>
                    <h1
                        className={`text-3xl font-bold ${
                            bannerColor ? "text-white" : "text-gray-800"
                        }`}
                    >
                        {initialUser.username}
                    </h1>
                    <p
                        className={`mt-1 text-sm ${
                            bannerColor ? "text-gray-200" : "text-gray-500"
                        }`}
                    >
                        На Ruddit с {registrationDate}
                    </p>

                    {/* Описание */}
                    {initialUser.bio && (
                        <p
                            className={`mt-4 ${
                                bannerColor ? "text-white" : "text-gray-700"
                            }`}
                        >
                            {initialUser.bio}
                        </p>
                    )}

                    <div className="mt-6 flex items-center gap-4 border-t pt-4">
                        {initialUser.linkTelegram && (
                            <a
                                href={initialUser.linkTelegram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-blue-500"
                                title="Telegram"
                            >
                                <Send className="w-auto h-5" />
                            </a>
                        )}
                        {initialUser.linkInstagram && (
                            <a
                                href={initialUser.linkInstagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-pink-500"
                                title="Instagram"
                            >
                                <Instagram className="w-auto h-5" />
                            </a>
                        )}
                        {initialUser.linkYouTube && (
                            <a
                                href={initialUser.linkYouTube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-red-600"
                                title="YouTube"
                            >
                                <Youtube className="w-auto h-5" />
                            </a>
                        )}
                        {initialUser.linkTikTok && (
                            <a
                                href={initialUser.linkTikTok}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-500 hover:text-black"
                                title="TikTok"
                            >
                                <Music2 className="w-auto h-5" />
                            </a>
                        )}
                        {initialUser.linkCustomUrl &&
                            initialUser.linkCustomName && (
                                <a
                                    href={initialUser.linkCustomUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline"
                                >
                                    <LinkIcon size={16} />{" "}
                                    {initialUser.linkCustomName}
                                </a>
                            )}
                    </div>

                    {/* Аудиоплеер */}
                    {initialUser.profileMusicUrl && (
                        <div className="mt-6 border-t pt-4 break-all">
                            {/* Передаем название трека в плеер */}
                            <CustomAudioPlayer
                                src={initialUser.profileMusicUrl}
                                trackName={(() => {
                                    const fullName =
                                        initialUser.profileMusicUrl
                                            .split("/")
                                            .pop()
                                            ?.split("-")
                                            .slice(1)
                                            .join(" ")
                                            .replace(".mp3", "") ||
                                        "Трек без названия";

                                    return fullName.length > 16
                                        ? `${fullName.substring(0, 16)}...`
                                        : fullName;
                                })()}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Переключатель вкладок */}
            <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === "posts"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Посты ({initialUser.posts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("comments")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === "comments"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Комментарии ({initialUser.comments.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("communities")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            activeTab === "communities"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Созданные сообщества (
                        {initialUser.createdCommunities.length})
                    </button>
                </nav>
            </div>

            {/* Контент вкладок */}
            <div className="mt-4 flex flex-col gap-4">
                {activeTab === "posts" && (
                    <>
                        {initialUser.posts.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            initialUser.posts.map((post: any) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500">
                                {/* Условный текст */}
                                {isOwnProfile
                                    ? "У вас еще нет постов."
                                    : "У пользователя еще нет постов."}
                            </p>
                        )}
                    </>
                )}
                {activeTab === "comments" && (
                    <>
                        {initialUser.comments.length > 0 ? (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            initialUser.comments.map((comment: any) => (
                                <CommentCard
                                    key={comment.id}
                                    comment={comment}
                                />
                            ))
                        ) : (
                            <p className="text-center text-gray-500">
                                {/* Условный текст */}
                                {isOwnProfile
                                    ? "У вас еще нет комментариев."
                                    : "У пользователя еще нет комментариев."}
                            </p>
                        )}
                    </>
                )}
                {activeTab === "communities" && (
                    <>
                        {initialUser.createdCommunities.length > 0 ? (
                            initialUser.createdCommunities.map(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (community: any) => (
                                    <Link
                                        key={community.id}
                                        href={`/s/${community.slug}`}
                                        className="block rounded-lg border bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md break-all"
                                    >
                                        <h3 className="font-bold text-lg break-all">
                                            с/{community.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1 break-all">
                                            {community.description}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {community._count.subscribers}{" "}
                                            подписчиков
                                        </p>
                                    </Link>
                                )
                            )
                        ) : (
                            <p className="text-center text-gray-500">
                                {/* Условный текст */}
                                {isOwnProfile
                                    ? "Вы еще не создали ни одного сообщества."
                                    : "Пользователь еще не создал ни одного сообщества."}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
