import React, { InputHTMLAttributes } from "react";

// Расширяем стандартные атрибуты инпута, чтобы можно было передавать placeholder, type и т.д.
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    id: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, id, ...props }, ref) => {
        return (
            <div>
                <label
                    htmlFor={id}
                    className="mb-1 block text-sm font-medium text-gray-700"
                >
                    {label}
                </label>
                <input
                    id={id}
                    ref={ref}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-0"
                    {...props}
                />
            </div>
        );
    }
);

Input.displayName = "Input"; // Хорошая практика для React DevTools
