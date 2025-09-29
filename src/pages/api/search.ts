import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const RESULTS_PER_PAGE = 10; // Определяем, сколько результатов на одной "странице"

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { q, page: queryPage } = req.query;

    if (typeof q !== "string" || q.trim() === "") {
        return res.status(200).json([]); // Возвращаем пустой массив, если запрос пустой
    }

    const page = Number(queryPage) || 1;

    try {
        const communities = await prisma.community.findMany({
            where: {
                // Ищем по частичному совпадению в названии или описании, без учета регистра
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ],
            },
            include: {
                _count: { select: { subscribers: true } },
            },
            take: RESULTS_PER_PAGE,
            skip: (page - 1) * RESULTS_PER_PAGE,
            orderBy: {
                // Можно добавить сортировку, например, по подписчикам
                subscribers: {
                    _count: "desc",
                },
            },
        });
        return res.status(200).json(communities);
    } catch (error) {
        console.error("Search API error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
