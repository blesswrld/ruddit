import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    logout,
    openLoginModal,
    openRegisterModal,
} from "@/store/slices/authSlice";
import Link from "next/link";

export const Header = () => {
    const dispatch = useAppDispatch();
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" }); // POST, чтобы избежать CSRF
        } catch (error) {
            console.error("Failed to logout", error);
        } finally {
            dispatch(logout());
        }
    };

    return (
        <header className="bg-white shadow-sm">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Логотип */}
                <Link href="/" className="text-xl font-bold text-gray-800">
                    Ruddit
                </Link>

                {/* Кнопки авторизации */}
                {isAuthenticated ? (
                    // Если пользователь вошел
                    <div className="flex items-center gap-4">
                        <span className="font-semibold">{user?.username}</span>
                        <button
                            onClick={handleLogout}
                            className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Выйти
                        </button>
                    </div>
                ) : (
                    // Если пользователь не вошел
                    <div className="flex items-center gap-4">
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
                )}
            </nav>
        </header>
    );
};
