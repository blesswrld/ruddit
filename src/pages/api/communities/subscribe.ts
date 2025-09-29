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
        const { communityId } = req.body;

        if (!communityId) {
            return res
                .status(400)
                .json({ message: "Community ID is required" });
        }

        // Проверяем, существует ли уже подписка
        const existingSubscription = await prisma.subscription.findUnique({
            where: {
                userId_communityId: {
                    userId,
                    communityId,
                },
            },
        });

        if (existingSubscription) {
            // Если подписка есть - удаляем (отписка)
            await prisma.subscription.delete({
                where: {
                    userId_communityId: {
                        userId,
                        communityId,
                    },
                },
            });
            return res
                .status(200)
                .json({ message: "Unsubscribed successfully" });
        } else {
            // Если подписки нет - создаем (подписка)
            await prisma.subscription.create({
                data: {
                    userId,
                    communityId,
                },
            });
            return res.status(201).json({ message: "Subscribed successfully" });
        }
    } catch (error) {
        console.error("Subscription error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
