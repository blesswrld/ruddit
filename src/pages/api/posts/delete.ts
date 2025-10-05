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

        // Находим пост, чтобы проверить автора
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });
        if (!post) return res.status(404).json({ message: "Post not found" });
        if (post.authorId !== userId)
            return res.status(403).json({ message: "Not authorized" });

        await prisma.$transaction(async (tx) => {
            // 1. Сначала удаляем все, что напрямую ссылается на Пост, КРОМЕ КОММЕНТАРИЕВ
            await tx.vote.deleteMany({ where: { postId: postId } });

            // 2. Получаем ID всех комментариев к этому посту
            const comments = await tx.comment.findMany({
                where: { postId: postId },
                select: { id: true },
            });
            const commentIds = comments.map((c) => c.id);

            // 3. Удаляем уведомления, связанные с постом ИЛИ с его комментариями
            await tx.notification.deleteMany({
                where: {
                    OR: [{ postId: postId }, { commentId: { in: commentIds } }],
                },
            });

            // Этот запрос рекурсивно находит и удаляет все комментарии, начиная с самых глубоких
            await tx.$executeRaw`
            WITH RECURSIVE "CommentHierarchy" AS (
            SELECT id FROM "Comment" WHERE "postId" = ${postId}
            UNION ALL
            SELECT c.id FROM "Comment" c
            INNER JOIN "CommentHierarchy" ch ON c."replyToId" = ch.id
            )
            DELETE FROM "Comment"
            WHERE id IN (SELECT id FROM "CommentHierarchy");
        `;

            // 5. Наконец, удаляем сам пост
            await tx.post.delete({
                where: { id: postId },
            });
        });

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Delete post error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
