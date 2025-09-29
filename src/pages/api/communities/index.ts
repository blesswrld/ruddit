import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const communities = await prisma.community.findMany({
            orderBy: {
                createdAt: "desc",
            },
            // Подгружаем количество подписчиков
            include: {
                _count: {
                    select: { subscribers: true },
                },
            },
        });

        return res.status(200).json(communities);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
