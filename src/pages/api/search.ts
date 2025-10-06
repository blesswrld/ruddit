import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { q } = req.query;

    if (typeof q !== "string" || q.trim().length < 2) {
        // Не ищем, если запрос слишком короткий, возвращаем пустые массивы
        return res.status(200).json({ communities: [], users: [] });
    }

    try {
        // Ищем и сообщества, и пользователей ОДНОВРЕМЕННО с помощью Promise.all
        const [communities, users] = await Promise.all([
            // Запрос для сообществ
            prisma.community.findMany({
                where: {
                    name: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
                include: {
                    _count: { select: { subscribers: true } },
                },
                take: 5, // Ограничиваем до 5 для выпадающего списка
                orderBy: {
                    subscribers: { _count: "desc" },
                },
            }),
            // Запрос для пользователей
            prisma.user.findMany({
                where: {
                    username: {
                        contains: q,
                        mode: "insensitive",
                    },
                },
                select: {
                    username: true,
                    avatarUrl: true,
                },
                take: 5, // Ограничиваем до 5 для выпадающего списка
            }),
        ]);

        return res.status(200).json({ communities, users });
    } catch (error) {
        console.error("Search API error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
