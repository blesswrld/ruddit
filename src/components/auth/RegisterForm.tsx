import { useAppDispatch } from "@/store/hooks";
import { closeModal } from "@/store/slices/authSlice";
import React, { useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";

export const RegisterForm = () => {
    const dispatch = useAppDispatch(); // Для закрытия модального окна

    // Состояния для данных формы
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Состояния для обратной связи
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true); // 1. Включаем состояние загрузки
        setError(null); // Сбрасываем предыдущие ошибки

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // 2. Если сервер вернул ошибку (статус не 2xx)
                throw new Error(data.message || "Что-то пошло не так");
            }

            // 3. Если всё успешно
            console.log("Успешная регистрация:", data);
            alert("Вы успешно зарегистрированы! Теперь можете войти."); // Временное решение
            dispatch(closeModal()); // Закрываем модальное окно
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            // 4. Ловим ошибку и показываем пользователю
            setError(err.message);
            console.error(err);
        } finally {
            // 5. Выключаем состояние загрузки в любом случае
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
                id="reg-username"
                label="Имя пользователя"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading} // Блокируем поля во время загрузки
                required
            />
            <Input
                id="reg-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
            />
            <Input
                id="reg-password"
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
            />

            {/* Отображение ошибки */}
            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
        </form>
    );
};
