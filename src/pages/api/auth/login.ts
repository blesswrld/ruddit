import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as cookie from "cookie"; // 1. Импортируем 'cookie'
import jwt from "jsonwebtoken"; // 2. Импортируем 'jsonwebtoken'
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const { email, password } = req.body;

        // Валидация
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Важно: не говорим, что именно неверно (email или пароль) для безопасности
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Сравниваем предоставленный пароль с хешем в базе
        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Создаем JWT
        const token = jwt.sign(
            { userId: user.id }, // Полезная нагрузка токена
            process.env.JWT_SECRET!, // Наш секретный ключ из .env
            { expiresIn: "1d" } // Время жизни токена (1 день)
        );

        // 4. Устанавливаем токен в httpOnly cookie
        res.setHeader(
            "Set-Cookie",
            cookie.serialize("token", token, {
                httpOnly: true, // Куки недоступны из JS на клиенте
                secure: process.env.NODE_ENV !== "development", // В продакшене только по HTTPS
                maxAge: 60 * 60 * 24, // 1 день в секундах
                sameSite: "strict", // Защита от CSRF
                path: "/", // Куки доступны на всем сайте
            })
        );

        // 5. Отправляем успешный ответ
        return res.status(200).json({
            id: user.id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
