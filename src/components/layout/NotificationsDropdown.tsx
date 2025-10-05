import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router"; // 1. Импортируем useRouter
import { useState, useRef, useEffect } from "react";

// Функция для получения уведомлений
const fetchNotifications = async () => {
    const { data } = await axios.get("/api/notifications", {
        withCredentials: true,
    });
    return data;
};

// Функция для отметки уведомления как прочитанного
const markAsRead = async (notificationId: string) => {
    await axios.post(
        "/api/notifications/read",
        { notificationId },
        { withCredentials: true }
    );
};

export const NotificationsDropdown = () => {
    const queryClient = useQueryClient();
    const router = useRouter(); // 2. Инициализируем роутер
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const { data: notifications, isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: fetchNotifications,
        staleTime: 60 * 1000, // Кешировать на 1 минуту
        refetchInterval: 60 * 1000, // Проверять новые раз в минуту
    });

    const mutation = useMutation({
        mutationFn: markAsRead,
        onSuccess: (_, notificationId) => {
            // Оптимистичное обновление: удаляем уведомление из списка, не дожидаясь refetch
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData(["notifications"], (oldData: any) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                oldData.filter((notif: any) => notif.id !== notificationId)
            );
        },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleNotificationClick = async (notif: any) => {
        // Сначала отмечаем как прочитанное
        await mutation.mutateAsync(notif.id);
        // Затем закрываем меню
        setIsOpen(false);
        // И переходим на нужную страницу с якорем
        router.push(
            `/s/${notif.post.community.slug}/post/${notif.post.id}#comment-${notif.commentId}`
        );
    };

    // Закрытие по клику вне меню
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const count = notifications?.length || 0;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-md p-2 hover:bg-gray-100"
            >
                <Bell className="h-6 w-6 text-gray-700" />
                {count > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {count > 9 ? "9+" : count}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-3 font-bold border-b text-sm">
                        Уведомления
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading && (
                            <p className="p-4 text-center text-sm text-gray-500">
                                Загрузка...
                            </p>
                        )}
                        {!isLoading && count === 0 && (
                            <p className="p-4 text-center text-sm text-gray-500">
                                Новых уведомлений нет.
                            </p>
                        )}
                        {/* eslint-disable-next-line
                        @typescript-eslint/no-explicit-any */}
                        {notifications?.map((notif: any) => (
                            <div
                                key={notif.id}
                                className="group flex items-start gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
                            >
                                {/* eslint-disable-next-line
                                @next/next/no-img-element */}
                                <img
                                    src={
                                        notif.sender.avatarUrl ||
                                        "/default-avatar.png"
                                    }
                                    alt="avatar"
                                    className="h-8 w-8 rounded-full mt-1"
                                />
                                <div className="text-sm flex-grow">
                                    <p>
                                        {/* Имя пользователя отдельная ссылка */}
                                        <Link
                                            href={`/u/${notif.sender.username}`}
                                            className="font-bold hover:underline"
                                        >
                                            {notif.sender.username}
                                        </Link>
                                        {" ответил на ваш комментарий в посте "}
                                        {/* Название поста отдельная ссылка */}
                                        <button
                                            onClick={() =>
                                                handleNotificationClick(notif)
                                            }
                                            className="font-semibold text-blue-600 hover:underline text-left"
                                        >
                                            {notif.post.title}
                                        </button>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(
                                            notif.createdAt
                                        ).toLocaleString("ru-RU")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => mutation.mutate(notif.id)}
                                    className="p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-green-100 text-gray-400 hover:text-green-600 transition-opacity"
                                    title="Отметить как прочитанное"
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
