import {
    logout,
    openLoginModal,
    openRegisterModal,
} from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SearchInput } from "../components/common/SearchInput";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import { NotificationsDropdown } from "./layout/NotificationsDropdown";

export const Header = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();

    const { isAuthenticated, user, status } = useAppSelector(
        (state) => state.auth
    );
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" }); // POST, чтобы избежать CSRF
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            dispatch(logout());
            router.reload(); // Перезагружаем страницу
        }
    };

    const renderAuthSection = () => {
        // Если проверка еще не завершилась, показываем пустой div, чтобы шапка не прыгала
        if (status === "loading" || status === "idle") {
            return <div className="h-full w-48" />; // Заглушка, чтобы зарезервировать место
        }

        if (isAuthenticated) {
            return (
                // UI для залогиненного пользователя
                <div className="flex h-full items-center gap-4">
                    <Link
                        href="/submit"
                        title="Создать пост"
                        className="rounded-md p-2 hover:bg-gray-100 border-none outline-none"
                    >
                        <Plus className="h-6 w-6 text-gray-700" />
                    </Link>

                    <NotificationsDropdown />

                    {/* Меню пользователя */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-2 rounded-md p-1 hover:bg-gray-100"
                        >
                            {user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={user.avatarUrl}
                                    alt="Аватар"
                                    className="h-8 w-8 rounded-full object-cover"
                                />
                            ) : (
                                // Заглушка, если нет аватара - первая буква ника
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-sm font-bold text-white">
                                    {user?.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </button>
                        {/* Выпадающее меню */}
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                                <div className="py-1">
                                    <Link
                                        href={`/u/${user?.username}`}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Мой профиль
                                    </Link>
                                    <Link
                                        href="/communities?show=subscribed"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Мои сообщества
                                    </Link>
                                    <Link
                                        href="/s/create"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Создать сообщество
                                    </Link>
                                    <Link
                                        href="/settings/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Настройки
                                    </Link>
                                    <div className="border-t my-1"></div>{" "}
                                    <Link
                                        href="/faq"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Помощь (FAQ)
                                    </Link>
                                    <div className="border-t my-1"></div>{" "}
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Выйти
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        } else {
            // Кнопки для гостя
            return (
                // UI для гостя
                <div className="flex h-full items-center gap-4">
                    <button
                        onClick={() => dispatch(openLoginModal())}
                        className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Войти
                    </button>
                    <button
                        onClick={() => dispatch(openRegisterModal())}
                        className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                    >
                        Регистрация
                    </button>
                </div>
            );
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-white shadow-sm">
            <nav className="container mx-auto flex h-16 items-center justify-between gap-6 px-4">
                <div className="flex items-center gap-6">
                    {/* Логотип */}
                    <Link
                        href=""
                        className="text-xl font-bold text-gray-800 hover:text-blue-600"
                    >
                        Ruddit
                    </Link>
                    <Link
                        href="/"
                        className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                        Лента
                    </Link>
                    <Link
                        href="/communities"
                        className="text-sm font-semibold text-gray-600 hover:text-gray-900"
                    >
                        Сообщества
                    </Link>
                </div>
                {/* Поиск */}
                <div className="flex-grow max-w-md">
                    <SearchInput />
                </div>
                {/* Вместо тернарного оператора используем нашу функцию */}
                {renderAuthSection()}
            </nav>
        </header>
    );
};
