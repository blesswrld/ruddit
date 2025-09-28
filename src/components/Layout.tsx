import React from "react";
import { AuthModals } from "./AuthModals"; // 1. Импортируем
import { Header } from "./Header";

type LayoutProps = {
    children: React.ReactNode;
};

export const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="flex min-h-screen flex-col bg-gray-100">
            <Header />
            <AuthModals /> {/* 2. Добавляем компонент сюда */}
            <main className="container mx-auto flex-grow px-4 py-8">
                {children}
            </main>
            {/* Здесь в будущем может быть подвал (Footer) */}
        </div>
    );
};
