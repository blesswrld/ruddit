import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

// Вспомогательная функция для создания слага
const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-") // Заменяем пробелы на -
        .replace(/[^\w\-]+/g, "") // Удаляем все не-буквенно-цифровые символы
        .replace(/\-\-+/g, "-"); // Заменяем несколько -- на один -
};

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
        // 1. Получаем `name`, `description`, `imageUrl`
        const { communityId, name, description, imageUrl } = req.body;

        // Находим сообщество, чтобы проверить, существует ли оно
        const community = await prisma.community.findUnique({
            where: { id: communityId },
        });
        if (!community)
            return res.status(404).json({ message: "Сообщество не найдено" });
        if (community.creatorId !== userId)
            return res.status(403).json({ message: "Нет доступа" });

        // 2. Валидация для нового имени
        if (name && (name.trim().length < 3 || name.length > 30)) {
            return res
                .status(400)
                .json({ message: "Название должно быть от 3 до 30 символов." });
        }

        // 3. Создаем новый slug, если имя изменилось
        let newSlug = community.slug;
        if (name && name !== community.name) {
            newSlug = slugify(name);
            // Проверяем, не занят ли новый slug
            const existing = await prisma.community.findUnique({
                where: { slug: newSlug },
            });
            if (existing && existing.id !== communityId) {
                return res
                    .status(409)
                    .json({ message: "Такое имя уже занято." });
            }
        }

        // 4. Если все проверки пройдены, обновляем данные
        const updatedCommunity = await prisma.community.update({
            where: { id: communityId },
            data: {
                name: name ?? undefined,
                slug: newSlug,
                description: description ?? undefined,
                imageUrl: imageUrl ?? undefined,
            },
        });

        return res.status(200).json(updatedCommunity);
    } catch (error) {
        console.error("Community update error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
