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
        const { recipientId } = req.body;

        if (!recipientId) {
            return res
                .status(400)
                .json({ message: "Recipient ID is required" });
        }
        if (recipientId === userId) {
            return res
                .status(400)
                .json({ message: "Cannot create a chat with yourself" });
        }

        // Ищем существующую беседу между этими двумя пользователями
        const existingConversation = await prisma.conversation.findFirst({
            where: {
                AND: [
                    { participants: { some: { id: userId } } },
                    { participants: { some: { id: recipientId } } },
                ],
                NOT: {
                    participants: {
                        some: { id: { notIn: [userId, recipientId] } },
                    },
                },
            },
        });

        if (existingConversation) {
            return res.status(200).json(existingConversation); // Возвращаем существующую
        }

        // Если не нашли, создаем новую
        const newConversation = await prisma.conversation.create({
            data: {
                participants: {
                    connect: [{ id: userId }, { id: recipientId }],
                },
            },
        });
        return res.status(201).json(newConversation);
    } catch (error) {
        console.error("Chat creation error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
