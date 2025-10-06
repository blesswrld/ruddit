"use client";

import { Share2 } from "lucide-react";
import toast from "react-hot-toast";

export const ShareButton = () => {
    const handleShare = () => {
        // Получаем текущий URL страницы
        const currentUrl = window.location.href;

        // Используем современный Clipboard API
        navigator.clipboard.writeText(currentUrl).then(
            () => {
                // Успех
                toast.success("Ссылка на профиль скопирована!");
            },
            (err) => {
                // Ошибка
                toast.error("Не удалось скопировать ссылку.");
                console.error("Could not copy text: ", err);
            }
        );
    };

    return (
        <button
            onClick={handleShare}
            className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            title="Скопировать ссылку на профиль"
        >
            <Share2 size={14} />
            Поделиться
        </button>
    );
};
