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

        if (text.length > 5000) {
            return res.status(400).json({
                message: "Комментарий не может быть длиннее 5000 символов.",
            });
        }

        // Загружаем пост, чтобы узнать ID его автора
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Если это ответ на другой комментарий (replyToId существует)
        if (replyToId) {
            // Находим родительский комментарий, чтобы узнать ID его автора
            const parentComment = await prisma.comment.findUnique({
                where: { id: replyToId },
                select: { authorId: true },
            });

            // Создаем уведомление для автора родительского комментария,
            // ТОЛЬКО если пользователь не отвечает сам себе
            if (parentComment && parentComment.authorId !== userId) {
                await prisma.notification.create({
                    data: {
                        type: "NEW_REPLY",
                        recipientId: parentComment.authorId,
                        senderId: userId,
                        postId: postId,
                        commentId: replyToId,
                    },
                });
            }
        } else {
            // Если это комментарий верхнего уровня, уведомляем автора поста
            // (если это не он сам)
            if (post.authorId !== userId) {
                await prisma.notification.create({
                    data: {
                        type: "NEW_COMMENT_ON_POST",
                        recipientId: post.authorId,
                        senderId: userId,
                        postId: postId,
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
