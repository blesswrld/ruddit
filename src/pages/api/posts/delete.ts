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
        const { postId } = req.body;

        if (!postId) {
            return res.status(400).json({ message: "Post ID is required" });
        }

        // 1. Находим пост, чтобы проверить автора
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true }, // Запрашиваем только ID автора для проверки
        });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // 2. Проверяем права доступа
        if (post.authorId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to delete this post",
            });
        }

        // 3. Удаляем пост. Prisma автоматически удалит связанные голоса и комменты (из-за onDelete: Cascade)
        await prisma.post.delete({
            where: { id: postId },
        });

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Delete post error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
