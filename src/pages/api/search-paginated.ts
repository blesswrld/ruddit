import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const RESULTS_PER_PAGE = 10;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { q, page: queryPage, type = "communities" } = req.query;

    if (typeof q !== "string" || q.trim() === "") {
        return res.status(200).json([]);
    }

    const page = Number(queryPage) || 1;

    try {
        let results;
        if (type === "users") {
            results = await prisma.user.findMany({
                where: { username: { contains: q, mode: "insensitive" } },
                select: { username: true, avatarUrl: true, createdAt: true },
                take: RESULTS_PER_PAGE,
                skip: (page - 1) * RESULTS_PER_PAGE,
            });
        } else {
            results = await prisma.community.findMany({
                where: {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { description: { contains: q, mode: "insensitive" } },
                    ],
                },
                include: { _count: { select: { subscribers: true } } },
                take: RESULTS_PER_PAGE,
                skip: (page - 1) * RESULTS_PER_PAGE,
            });
        }
        return res.status(200).json(results);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
