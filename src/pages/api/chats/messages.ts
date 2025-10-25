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
    if (req.method !== "POST")
        return res.status(405).json({ message: "Method Not Allowed" });

    const { token } = req.cookies;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const { conversationId, text } = req.body;

        if (!conversationId || !text || text.trim() === "") {
            return res
                .status(400)
                .json({ message: "Conversation ID and text are required" });
        }

        const [, newMessage] = await prisma.$transaction([
            prisma.conversation.update({
                where: { id: conversationId },
                data: { updatedAt: new Date() },
            }),
            prisma.message.create({
                data: { text, authorId: userId, conversationId },
                include: {
                    author: { select: { username: true, avatarUrl: true } },
                },
            }),
        ]);

        // ОТПРАВЛЯЕМ ЗАПРОС НА НАШ WEBSOCKET-СЕРВЕР
        try {
            await fetch("http://localhost:3001/emit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId, message: newMessage }),
            });
        } catch (e) {
            console.error("Failed to emit message to socket server", e);
        }

        return res.status(201).json(newMessage);
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
