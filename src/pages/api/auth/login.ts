import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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

        // 1. Валидация
        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        // 2. Ищем пользователя по email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Важно: не говорим, что именно неверно (email или пароль) для безопасности
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 3. Сравниваем предоставленный пароль с хешем в базе
        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // 4. Успешный вход
        // TODO: В будущем здесь будет генерация JWT-токена
        return res.status(200).json({
            message: "Logged in successfully",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
