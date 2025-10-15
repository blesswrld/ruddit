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
        // 1. Получаем imageUrls из body
        const { title, content, communityId, imageUrls } = req.body;

        // Валидация
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
        // Валидация для изображений
        if (imageUrls && (!Array.isArray(imageUrls) || imageUrls.length > 5)) {
            return res
                .status(400)
                .json({ message: "Можно загрузить не более 5 изображений." });
        }

        // Проверка на подписку или авторство
        const community = await prisma.community.findUnique({
            where: { id: communityId },
        });
        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        // Является ли пользователь подписчиком?
        const subscription = await prisma.subscription.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!subscription && community.creatorId !== userId) {
            return res.status(403).json({
                message:
                    "Вы должны быть участником или создателем сообщества, чтобы создавать посты.",
            });
        }

        // 2. Используем транзакцию, чтобы создать пост, картинки и уведомления атомарно
        const post = await prisma.$transaction(async (tx) => {
            const newPost = await tx.post.create({
                data: {
                    title,
                    content,
                    authorId: userId,
                    communityId: communityId,
                    // 3. Создаем связанные изображения
                    images: {
                        createMany: {
                            data: imageUrls
                                ? imageUrls.map((url: string) => ({ url }))
                                : [],
                        },
                    },
                },
                include: {
                    images: true,
                },
            });

            // Находим всех подписчиков сообщества, кроме автора поста
            const subscribers = await tx.subscription.findMany({
                where: {
                    communityId: communityId,
                    userId: { not: userId }, // Не уведомляем самого себя
                },
                select: { userId: true },
            });

            if (subscribers.length > 0) {
                const notificationsData = subscribers.map((sub) => ({
                    type: "NEW_POST_IN_SUB" as const,
                    recipientId: sub.userId,
                    senderId: userId,
                    postId: newPost.id,
                }));
                // Создаем все уведомления одним запросом
                await tx.notification.createMany({
                    data: notificationsData,
                });
            }

            return newPost;
        });

        return res.status(201).json(post);
    } catch (error) {
        console.error("Post creation error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
