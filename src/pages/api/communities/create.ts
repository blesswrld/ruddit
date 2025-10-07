import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

interface JwtPayload {
    userId: string;
}

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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    // 1. Проверяем аутентификацию
    const { token } = req.cookies;
    if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;

        // Проверка ограничения
        const ownedCommunitiesCount = await prisma.community.count({
            where: {
                creatorId: userId,
            },
        });

        if (ownedCommunitiesCount >= 10) {
            return res.status(403).json({
                message: "Вы достигли лимита в 10 созданных сообществ.",
            });
        }

        // 2. Получаем и валидируем данные
        const { name, description } = req.body;
        if (!name || name.trim().length < 3) {
            return res
                .status(400)
                .json({ message: "Название должно быть длиннее 3 символов" });
        }

        // Генерируем слаг
        const slug = slugify(name);

        // 3. Проверяем, не занято ли имя
        const existingCommunity = await prisma.community.findUnique({
            where: { slug }, // Ищем по слагу
        });
        if (existingCommunity) {
            return res.status(409).json({
                message: "Сообщество с таким названием уже существует",
            });
        }

        // 4. Используем транзакцию для создания сообщества и подписки
        const newCommunity = await prisma.$transaction(async (tx) => {
            // 4.1 Создаем сообщество
            const community = await tx.community.create({
                data: {
                    name,
                    slug,
                    description,
                    creatorId: userId,
                },
            });

            // 4.2 Автоматически подписываем создателя на его сообщество
            await tx.subscription.create({
                data: {
                    userId,
                    communityId: community.id,
                },
            });

            return community;
        });

        return res.status(201).json(newCommunity);
    } catch (error) {
        console.error("Community creation error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
