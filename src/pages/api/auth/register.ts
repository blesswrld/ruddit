import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // 1. Принимаем только POST запросы
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const { username, email, password } = req.body;

        // 2. Простая валидация
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // 3. Проверяем, не заняты ли email или имя пользователя
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return res
                .status(409)
                .json({ message: "Username or email already exists" });
        }

        // 4. Хешируем пароль
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 5. Создаем пользователя в базе данных
        const user = await prisma.user.create({
            data: {
                username,
                email,
                passwordHash,
            },
        });

        // 6. Отправляем успешный ответ (не отправляем хеш пароля обратно!)
        return res.status(201).json({
            id: user.id,
            username: user.username,
            email: user.email,
        });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
