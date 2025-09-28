import {
    logout,
    openLoginModal,
    openRegisterModal,
} from "@/store/slices/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Link from "next/link";

export const Header = () => {
    const dispatch = useAppDispatch();
    const { isAuthenticated, user, status } = useAppSelector(
        (state) => state.auth
    );

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" }); // POST, чтобы избежать CSRF
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            dispatch(logout());
        }
    };

    const renderAuthButtons = () => {
        // Если проверка еще не завершилась, показываем пустой div, чтобы шапка не прыгала
        if (status === "loading" || status === "idle") {
            return <div className="h-full w-48" />; // Заглушка, чтобы зарезервировать место
        }

        if (isAuthenticated) {
            return (
                // UI для залогиненного пользователя
                <div className="flex h-full items-center gap-4">
                    <Link
                        href="/s/create"
                        className="rounded-md px-3 py-2 text-sm font-semibold hover:bg-gray-100"
                    >
                        Создать сообщество
                    </Link>
                    <span className="font-semibold">{user?.username}</span>
                    <button
                        onClick={handleLogout}
                        className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Выйти
                    </button>
                </div>
            );
        } else {
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
        <header className="bg-white shadow-sm">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Логотоп */}
                <Link href="/" className="text-xl font-bold text-gray-800">
                    Ruddit
                </Link>
                {/* Вместо тернарного оператора используем нашу функцию */}
                {renderAuthButtons()}
            </nav>
        </header>
    );
};
