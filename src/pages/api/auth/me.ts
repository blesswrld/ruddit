import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

// Определим тип для полезной нагрузки нашего JWT
interface JwtPayload {
    userId: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        // 1. Получаем токен из cookie
        const { token } = req.cookies;

        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        // 2. Верифицируем токен
        const payload = verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // 3. Находим пользователя в базе по ID из токена
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                // Выбираем только те поля, которые безопасно отправлять на клиент
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                bio: true,
            },
        });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // 4. Отправляем данные пользователя
        return res.status(200).json(user);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        // Если токен невалидный (истек срок, подделан), verify выбросит ошибку
        return res.status(401).json({ message: "Not authenticated" });
    }
}
