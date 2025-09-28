import React, { useState } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";

export const RegisterForm = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Предотвращаем стандартную отправку формы
        console.log("Регистрация:", { username, email, password });
        // TODO: Здесь будет логика отправки данных на API
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
                id="reg-username"
                label="Имя пользователя"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
            <Input
                id="reg-email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <Input
                id="reg-password"
                label="Пароль"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <Button type="submit">Зарегистрироваться</Button>
        </form>
    );
};
