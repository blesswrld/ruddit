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

    // Получаем slug из URL
    const { slug } = req.query;

    if (typeof slug !== "string") {
        return res.status(400).json({ message: "Invalid slug" });
    }

    try {
        const community = await prisma.community.findUnique({
            where: { slug },
            include: {
                // В будущем здесь можно будет подгружать посты, подписчиков и т.д.
                creator: {
                    select: { username: true }, // Подгружаем имя создателя
                },
            },
        });

        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        return res.status(200).json(community);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
