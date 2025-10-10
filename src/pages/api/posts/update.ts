import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// Инициализируем S3 клиент для Яндекса
const s3Client = new S3Client({
    region: process.env.YANDEX_REGION!,
    endpoint: "https://storage.yandexcloud.net",
    credentials: {
        accessKeyId: process.env.YANDEX_ACCESS_KEY_ID!,
        secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY!,
    },
});

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
        // Получаем все данные, включая imageUrls
        const { postId, title, content, imageUrls } = req.body;

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
        if (imageUrls && (!Array.isArray(imageUrls) || imageUrls.length > 5)) {
            return res
                .status(400)
                .json({ message: "Можно прикрепить не более 5 изображений." });
        }

        // Загружаем пост и его текущие изображения
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { images: true },
        });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.authorId !== userId) {
            return res
                .status(403)
                .json({ message: "You are not authorized to edit this post" });
        }

        const currentImageUrls = post.images.map((img) => img.url);
        const newImageUrls: string[] = imageUrls || []; // Указываем тип

        // Находим URLы, которые нужно удалить
        const urlsToDelete = currentImageUrls.filter(
            (url) => !newImageUrls.includes(url)
        );

        if (urlsToDelete.length > 0) {
            const keysToDelete = urlsToDelete.map((url) => {
                const urlParts = new URL(url);
                return urlParts.pathname.substring(1);
            });

            const deleteCommand = new DeleteObjectsCommand({
                Bucket: process.env.NEXT_PUBLIC_YANDEX_BUCKET_NAME,
                Delete: {
                    Objects: keysToDelete.map((Key) => ({ Key })),
                },
            });
            await s3Client.send(deleteCommand);
        }

        // Используем транзакцию для обновления данных в БД
        await prisma.$transaction(async (tx) => {
            // Обновляем title и content
            await tx.post.update({
                where: { id: postId },
                data: {
                    title,
                    content,
                },
            });

            // Удаляем записи об изображениях из БД
            await tx.image.deleteMany({
                where: {
                    postId: postId,
                    url: { in: urlsToDelete },
                },
            });

            // Находим URLы, которые нужно добавить
            const urlsToAdd = newImageUrls.filter(
                (url) => !currentImageUrls.includes(url)
            );

            // Добавляем новые записи об изображениях в БД
            if (urlsToAdd.length > 0) {
                await tx.image.createMany({
                    data: urlsToAdd.map((url: string) => ({
                        // Указываем тип
                        url,
                        postId: postId,
                    })),
                });
            }
        });

        // Возвращаем обновленный пост со всеми связями
        const updatedPostWithRelations = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                images: true,
                author: true,
                votes: true,
                community: true,
            },
        });

        return res.status(200).json(updatedPostWithRelations);
    } catch (error) {
        console.error("Update post error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
