import { useAppDispatch } from "@/store/hooks";
import { closeModal } from "@/store/slices/authSlice";
import React, { useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { setUser } from "@/store/slices/authSlice"; // Импортируем setUser

export const LoginForm = () => {
    const dispatch = useAppDispatch();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Что-то пошло не так");
            }

            dispatch(setUser(data)); // Сохраняем пользователя в Redux
            dispatch(closeModal()); // Закрываем модальное окно

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
                id="login-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
            />
            <Input
                id="login-password"
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
            />

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Вход..." : "Войти"}
            </Button>
        </form>
    );
};
