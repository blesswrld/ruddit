import React from "react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
};

export const Modal = ({ isOpen, onClose, children, title }: ModalProps) => {
    if (!isOpen) {
        return null;
    }

    return (
        // Оверлей (фон)
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            {/* Контейнер модального окна */}
            <div
                className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()} // Предотвращает закрытие по клику внутри окна
            >
                {/* Шапка модального окна */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl font-light text-gray-500 hover:text-gray-800"
                    >
                        &times; {/* Это крестик */}
                    </button>
                </div>

                {/* Содержимое */}
                <div>{children}</div>
            </div>
        </div>
    );
};
