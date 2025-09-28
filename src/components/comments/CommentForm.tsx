import { useState } from "react";
import { useRouter } from "next/router";

type CommentFormProps = {
    postId: string;
};

export const CommentForm = ({ postId }: CommentFormProps) => {
    const router = useRouter(); // Для перезагрузки страницы
    const [text, setText] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() === "") return;

        setIsLoading(true);

        await fetch("/api/posts/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, text }),
            credentials: "include",
        });

        setIsLoading(false);
        setText("");
        // Перезагружаем данные страницы, чтобы увидеть новый коммент
        router.replace(router.asPath);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-4 rounded-md bg-white p-4 shadow"
        >
            <h3 className="mb-2 text-lg font-semibold">Оставить комментарий</h3>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
                placeholder="Что думаете?"
                disabled={isLoading}
            />
            <div className="mt-2 flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading || text.trim() === ""}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading ? "Отправка..." : "Отправить"}
                </button>
            </div>
        </form>
    );
};
