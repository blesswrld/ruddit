import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

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

    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;

        const notifications = await prisma.notification.findMany({
            where: {
                recipientId: userId,
                isRead: false, // Загружаем только непрочитанные
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                sender: { select: { username: true, avatarUrl: true } },
                post: {
                    select: {
                        id: true,
                        title: true,
                        community: {
                            select: {
                                slug: true,
                                name: true,
                            },
                        },
                    },
                }, // Добавил community.slug для ссылки
                comment: { select: { id: true } },
            },
            take: 20, // Ограничиваем количество для производительности
        });

        return res.status(200).json(notifications);
    } catch (error) {
        console.error("Fetch notifications error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
