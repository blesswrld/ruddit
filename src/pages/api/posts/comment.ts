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
        const { postId, text, replyToId } = req.body;

        if (!postId || !text || text.trim() === "") {
            return res
                .status(400)
                .json({ message: "Post ID and text are required" });
        }

        // Если это ответ на другой комментарий (replyToId существует)
        if (replyToId) {
            // Находим родительский комментарий, чтобы узнать ID его автора
            const parentComment = await prisma.comment.findUnique({
                where: { id: replyToId },
                select: { authorId: true },
            });

            // Создаем уведомление, ТОЛЬКО если пользователь не отвечает сам себе
            if (parentComment && parentComment.authorId !== userId) {
                await prisma.notification.create({
                    data: {
                        type: "NEW_REPLY",
                        recipientId: parentComment.authorId, // Получатель - автор родительского коммента
                        senderId: userId, // Отправитель - текущий юзер
                        postId: postId,
                        commentId: replyToId, // Ссылка на родительский коммент
                    },
                });
            }
        }

        const comment = await prisma.comment.create({
            data: {
                text,
                postId,
                authorId: userId,
                replyToId, // Будет undefined, если это комментарий верхнего уровня
            },
        });

        return res.status(201).json(comment);
    } catch (error) {
        console.error("Comment creation error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
