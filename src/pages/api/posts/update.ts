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
        // Получаем только те данные, которые нужны для обновления поста
        const { postId, title, content } = req.body;

        // Валидация для поста
        if (!postId || title === undefined || content === undefined) {
            return res
                .status(400)
                .json({ message: "Post ID, title, and content are required" });
        }

        // Добавляем валидацию для заголовка
        if (title.trim().length === 0) {
            return res
                .status(400)
                .json({ message: "Заголовок не может быть пустым." });
        }
        if (title.length > 70) {
            return res.status(400).json({
                message: "Заголовок не может быть длиннее 70 символов.",
            });
        }
        if (content && content.length > 5000) {
            return res.status(400).json({
                message: "Текст поста не может быть длиннее 5000 символов.",
            });
        }

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.authorId !== userId) {
            return res
                .status(403)
                .json({ message: "You are not authorized to edit this post" });
        }

        const updatedPost = await prisma.post.update({
            where: { id: postId },
            // Обновляем и title, и content
            data: {
                title,
                content,
            },
        });

        return res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Update post error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
