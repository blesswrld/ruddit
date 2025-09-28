import React, { ButtonHTMLAttributes } from "react";

// Расширяем стандартные атрибуты кнопки, чтобы можно было передавать onClick, type и т.д.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export const Button = ({ children, ...props }: ButtonProps) => {
    return (
        <button
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
        >
            {children}
        </button>
    );
};
