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
        const { commentId, text } = req.body;

        if (
            !commentId ||
            text === undefined ||
            typeof text !== "string" ||
            text.trim() === ""
        ) {
            return res.status(400).json({
                message: "Comment ID and non-empty text are required",
            });
        }

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to edit this comment",
            });
        }

        const updatedComment = await prisma.comment.update({
            where: { id: commentId },
            data: { text },
        });

        return res.status(200).json(updatedComment);
    } catch (error) {
        console.error("Comment update error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
