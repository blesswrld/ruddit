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
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const { notificationId } = req.body;

        if (!notificationId) {
            return res
                .status(400)
                .json({ message: "Notification ID is required" });
        }

        // Находим уведомление, чтобы убедиться, что оно принадлежит текущему пользователю
        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                recipientId: userId,
            },
        });

        if (!notification) {
            return res.status(404).json({
                message: "Notification not found or you are not authorized",
            });
        }

        // Обновляем статус isRead на true
        await prisma.notification.update({
            where: {
                id: notificationId,
            },
            data: {
                isRead: true,
            },
        });

        return res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Mark notification as read error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
