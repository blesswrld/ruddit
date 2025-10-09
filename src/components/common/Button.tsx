import React, { ButtonHTMLAttributes } from "react";

// Расширяем стандартные атрибуты кнопки, чтобы можно было передавать onClick, type и т.д.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: "primary" | "secondary" | "danger"; // 1. Добавляем вариант
}

export const Button = ({
    children,
    variant = "primary",
    className,
    ...props
}: ButtonProps) => {
    // 2. Определяем стили для каждого варианта
    const baseClasses =
        "rounded-md px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    const variantClasses = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
        secondary:
            "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
        danger: "bg-red-600 text-white hover:bg-red-800 focus:ring-red-500",
    };

    return (
        // 3. Собираем классы вместе
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
