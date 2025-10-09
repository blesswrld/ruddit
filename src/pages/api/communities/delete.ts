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
    if (req.method !== "POST")
        return res.status(405).json({ message: "Method Not Allowed" });

    const { token } = req.cookies;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    try {
        const { userId } = verify(token, process.env.JWT_SECRET!) as JwtPayload;
        const { communityId } = req.body;
        if (!communityId)
            return res
                .status(400)
                .json({ message: "Community ID is required" });

        const community = await prisma.community.findUnique({
            where: { id: communityId },
        });
        if (!community)
            return res.status(404).json({ message: "Community not found" });
        if (community.creatorId !== userId)
            return res.status(403).json({ message: "Not authorized" });

        // Prisma автоматически удалит все связанные посты, подписки и т.д.
        // благодаря `onDelete: Cascade`, который мы настроили.
        await prisma.community.delete({ where: { id: communityId } });

        return res
            .status(200)
            .json({ message: "Community deleted successfully" });
    } catch (error) {
        console.error("Community delete error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
