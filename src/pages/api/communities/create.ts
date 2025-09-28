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

        // 2. Получаем и валидируем данные
        const { name, description } = req.body;
        if (!name || name.trim().length < 3) {
            return res
                .status(400)
                .json({ message: "Name must be at least 3 characters long" });
        }

        // Генерируем слаг
        const slug = slugify(name);

        // 3. Проверяем, не занято ли имя
        const existingCommunity = await prisma.community.findUnique({
            where: { slug }, // Ищем по слагу
        });
        if (existingCommunity) {
            return res
                .status(409)
                .json({ message: "A community with this name already exists" });
        }

        // 4. Создаем сообщество
        const community = await prisma.community.create({
            data: {
                name,
                slug, // Сохраняем слаг
                description,
                creatorId: userId,
            },
        });

        return res.status(201).json(community);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return res
            .status(401)
            .json({ message: "Invalid token or server error" });
    }
}
