import { useState } from "react";
import { useRouter } from "next/router";
import { useAppSelector } from "@/store/hooks"; // Импортируем хуки Redux
import { useDispatch } from "react-redux";
import { openLoginModal } from "@/store/slices/authSlice";
import toast from "react-hot-toast";

type CommentFormProps = {
    postId: string;
};

export const CommentForm = ({ postId }: CommentFormProps) => {
    const router = useRouter(); // Для перезагрузки страницы
    const dispatch = useDispatch();

    const { isAuthenticated } = useAppSelector((state) => state.auth); // Получаем статус

    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const CONTENT_MAX_LENGTH = 5000;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() === "") return;

        // Если юзер не залогинен, открываем модалку
        if (!isAuthenticated) {
            dispatch(openLoginModal());
            return;
        }

        setIsLoading(true);

        toast
            .promise(
                fetch("/api/posts/comment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ postId, text }),
                    credentials: "include",
                }).then((res) => {
                    if (!res.ok)
                        throw new Error("Не удалось отправить комментарий.");
                }),
                {
                    loading: "Отправка комментария...",
                    success: () => {
                        setText(""); // Очищаем поле ввода
                        router.replace(router.asPath); // Обновляем данные на странице
                        return "Комментарий отправлен!";
                    },
                    error: (err) => `Ошибка: ${err.message}`,
                }
            )
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="mt-4 rounded-md bg-white p-4 shadow">
            <h3 className="mb-2 text-lg font-semibold">Оставить комментарий</h3>
            <form onSubmit={handleSubmit}>
                {/* Если не залогинен, показываем "заглушку" */}
                {!isAuthenticated ? (
                    <div
                        onClick={() => dispatch(openLoginModal())}
                        className="cursor-pointer rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500"
                    >
                        <mark>Войдите,</mark> чтобы оставить комментарий
                    </div>
                ) : (
                    // Если залогинен, показываем нормальную форму
                    <>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                            rows={3}
                            placeholder="Что думаете?"
                            disabled={isLoading}
                            maxLength={CONTENT_MAX_LENGTH} // 1. Атрибут
                        />
                        {/* 2. Счетчик */}
                        <p
                            className={`mt-1 text-right text-xs ${
                                text.length >= CONTENT_MAX_LENGTH
                                    ? "text-red-500"
                                    : "text-gray-500"
                            }`}
                        >
                            {text.length} / {CONTENT_MAX_LENGTH}
                        </p>
                        <div className="mt-2 flex justify-end">
                            <button
                                type="submit"
                                // 3. Блокировка кнопки
                                disabled={
                                    isLoading ||
                                    text.trim() === "" ||
                                    text.length > CONTENT_MAX_LENGTH
                                }
                                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isLoading ? "Отправка..." : "Отправить"}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};
