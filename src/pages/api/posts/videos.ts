import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 5;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "GET") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const page = Number(req.query.page) || 1;

    try {
        const posts = await prisma.post.findMany({
            where: {
                videoUrl: {
                    not: null, // Ищем только посты, где есть videoUrl
                },
            },
            take: POSTS_PER_PAGE,
            skip: (page - 1) * POSTS_PER_PAGE,
            orderBy: {
                createdAt: "desc",
            },
            include: {
                author: { select: { username: true, id: true } },
                community: { select: { slug: true } },
                votes: true,
                images: true, // Включаем, чтобы тип PostForCard был консистентным
            },
        });

        return res.status(200).json(posts);
    } catch (error) {
        console.error("Video feed error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
