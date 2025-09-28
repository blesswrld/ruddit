import Link from "next/link";

export const Header = () => {
    return (
        <header className="bg-white shadow-sm">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Логотип */}
                <Link href="/" className="text-xl font-bold text-gray-800">
                    Ruddit
                </Link>

                {/* Кнопки авторизации */}
                <div className="flex items-center gap-4">
                    <button className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50">
                        Войти
                    </button>
                    <button className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                        Регистрация
                    </button>
                </div>
            </nav>
        </header>
    );
};
