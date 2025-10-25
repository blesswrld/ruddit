import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const MESSAGES_PER_PAGE = 20;

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
        const { conversationId, page: queryPage } = req.query;

        if (typeof conversationId !== "string") {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        // Проверяем, что пользователь является участником этой беседы
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                participants: { some: { id: userId } },
            },
        });
        if (!conversation) {
            return res
                .status(403)
                .json({ message: "Not authorized to view this chat" });
        }

        const page = Number(queryPage) || 1;

        const messages = await prisma.message.findMany({
            where: { conversationId: conversationId },
            orderBy: { createdAt: "desc" }, // Сначала новые
            take: MESSAGES_PER_PAGE,
            skip: (page - 1) * MESSAGES_PER_PAGE,
            include: {
                author: { select: { username: true, avatarUrl: true } },
            },
        });

        return res.status(200).json(messages);
    } catch (error) {
        console.error("Fetch messages error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
