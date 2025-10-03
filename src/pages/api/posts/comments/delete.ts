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
        const { commentId } = req.body;

        if (!commentId) {
            return res.status(400).json({ message: "Comment ID is required" });
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to delete this comment",
            });
        }

        // Удаляем комментарий
        await prisma.comment.delete({ where: { id: commentId } });

        return res
            .status(200)
            .json({ message: "Comment deleted successfully" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        // Prisma вернет ошибку, если кто-то успел ответить на коммент (из-за onDelete: Restrict)
        if (error.code === "P2003") {
            return res.status(409).json({
                message:
                    "Нельзя удалить комментарий, на который уже есть ответы.",
            });
        }
        console.error("Comment delete error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
