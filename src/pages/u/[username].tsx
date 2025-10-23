import { CommentCard } from "@/components/comments/CommentCard";
import { PostCard } from "@/components/posts/PostCard";
import { CustomAudioPlayer } from "@/components/common/CustomAudioPlayer";
import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { useState } from "react";
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
    "#6366F1",
    "#10B981",
    "#14B8A6",
    "#F59E0B",
    "#F97316",
    "#EF4444",
    "#DC2626",
    "#8B5CF6",
    "#7C3AED",
    "#EC4899",
    "#D946EF",
    "#6366F1",
    "#18181b",
    "#0a0a0a",
];

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
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    description: true,
                    imageUrl: true,
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
    const [isLoading, setIsLoading] = useState(false);

    const handleColorChange = (newColor: string) => {
        setBannerColor(newColor); // Оптимистичное обновление
    };

    const handleSaveColor = () => {
        setIsLoading(true);
        toast
            .promise(
                fetch("/api/users/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ profileBannerColor: bannerColor }),
                    credentials: "include",
                }).then(async (res) => {
                    if (!res.ok) throw new Error("Не удалось сохранить цвет.");
                    const updatedUser = await res.json();
                    return updatedUser;
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
                        setIsPickerVisible(false);
                        return "Цвет профиля сохранен!";
                    },
                    error: (err) => err.message,
                }
            )
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleCancelColor = () => {
        setBannerColor(initialUser.profileBannerColor || "");
        setIsPickerVisible(false);
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
                                disabled={isLoading}
                            >
                                <Palette size={16} />
                            </button>
                            {isPickerVisible && (
                                <div className="absolute w-72 top-full right-0 mt-2 rounded-lg bg-white p-3 shadow-lg z-10">
                                    {/* Сетка с цветами */}
                                    <div className="grid grid-cols-6 gap-2">
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
                                    <div className="mt-4 flex justify-between items-center border-t pt-3">
                                        <button
                                            onClick={() =>
                                                handleColorChange("")
                                            } // Передаем пустую строку для сброса
                                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                                        >
                                            <X size={14} />
                                            Сбросить
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCancelColor}
                                                className="text-xs font-semibold text-gray-700 hover:text-black"
                                            >
                                                Отмена
                                            </button>
                                            <button
                                                onClick={handleSaveColor}
                                                className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                                            >
                                                Сохранить
                                            </button>
                                        </div>
                                    </div>
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
                                    {initialUser.linkCustomName}{" "}
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
                                        <div className="flex items-center gap-4">
                                            {/* Добавляем аватар сообщества */}
                                            {community.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={community.imageUrl}
                                                    alt={`Аватар с/${community.name}`}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="font-bold text-gray-500">
                                                        с/
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-lg break-all">
                                                    с/{community.name}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1 break-all">
                                                    {community.description}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2 break-all">
                                                    {
                                                        community._count
                                                            .subscribers
                                                    }{" "}
                                                    подписчиков
                                                </p>
                                            </div>
                                        </div>
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
