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
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { token } = req.cookies;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: { some: { id: userId } },
                messages: { some: {} }, // Возвращаем только чаты, где есть хотя бы одно сообщение
            },
            orderBy: { updatedAt: "desc" },
            include: {
                participants: {
                    where: { id: { not: userId } },
                    select: { id: true, username: true, avatarUrl: true },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });

        return res.status(200).json(conversations);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
