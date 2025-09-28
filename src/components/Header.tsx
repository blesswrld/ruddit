import { useAppDispatch } from "@/store/hooks"; // 1. Импортируем наш типизированный хук
import { openLoginModal, openRegisterModal } from "@/store/slices/authSlice"; // 2. Импортируем экшены
import Link from "next/link";

export const Header = () => {
    const dispatch = useAppDispatch(); // 3. Получаем функцию dispatch

    return (
        <header className="bg-white shadow-sm">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Логотип */}
                <Link href="/" className="text-xl font-bold text-gray-800">
                    Ruddit
                </Link>

                {/* Кнопки авторизации */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => dispatch(openLoginModal())} // 4. Диспатчим экшен по клику
                        className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Войти
                    </button>
                    <button
                        onClick={() => dispatch(openRegisterModal())} // 5. Диспатчим экшен по клику
                        className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                    >
                        Регистрация
                    </button>
                </div>
            </nav>
        </header>
    );
};
