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
        const { title, content, communityId } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({ message: "Заголовок обязателен" });
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

        if (!communityId) {
            return res
                .status(400)
                .json({ message: "Community ID is required" });
        }

        const communityExists = await prisma.community.findUnique({
            where: { id: communityId },
        });
        if (!communityExists) {
            return res.status(404).json({ message: "Community not found" });
        }

        // Является ли пользователь подписчиком?
        const subscription = await prisma.subscription.findUnique({
            where: {
                userId_communityId: {
                    userId,
                    communityId,
                },
            },
        });

        if (!subscription) {
            return res.status(403).json({
                message:
                    "Вы должны быть участником сообщества, чтобы создавать посты.",
            });
        }

        const post = await prisma.post.create({
            data: {
                title,
                content,
                authorId: userId,
                communityId: communityId,
            },
        });

        return res.status(201).json(post);
    } catch (error) {
        console.error("Post creation error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
