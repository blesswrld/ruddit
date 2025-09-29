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
        const { communityId, description } = req.body;

        // 1. Находим сообщество, чтобы проверить, существует ли оно
        const community = await prisma.community.findUnique({
            where: { id: communityId },
        });

        if (!community) {
            return res.status(404).json({ message: "Community not found" });
        }

        // 2. Проверяем, является ли текущий пользователь создателем этого сообщества
        if (community.creatorId !== userId) {
            return res
                .status(403)
                .json({ message: "Only the creator can edit this community" });
        }

        // 3. Если все проверки пройдены, обновляем данные
        const updatedCommunity = await prisma.community.update({
            where: { id: communityId },
            data: { description },
        });

        return res.status(200).json(updatedCommunity);
    } catch (error) {
        console.error("Community update error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
