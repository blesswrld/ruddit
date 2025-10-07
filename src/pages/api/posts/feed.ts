import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { verify } from "jsonwebtoken";

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 5; // Определяем, сколько постов на одной "странице"

// Определяем тип для JWT
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

    // Получаем параметры из запроса
    const page = Number(req.query.page) || 1;
    const feedType = req.query.feedType || "new"; // По умолчанию - лента "Новое"

    try {
        let posts;

        if (feedType === "subscribed") {
            const { token } = req.cookies;
            // Если гость пытается получить ленту подписок, возвращаем пустой массив
            if (!token) {
                return res.status(200).json([]);
            }

            const { userId } = verify(
                token,
                process.env.JWT_SECRET!
            ) as JwtPayload;

            // Находим ID сообществ, на которые подписан пользователь
            const subscriptions = await prisma.subscription.findMany({
                where: { userId },
                select: { communityId: true },
            });
            const subscribedCommunityIds = subscriptions.map(
                (sub) => sub.communityId
            );

            // Ищем посты только в этих сообществах
            posts = await prisma.post.findMany({
                where: {
                    communityId: {
                        in: subscribedCommunityIds,
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
                },
            });
        } else if (feedType === "hot") {
            // Блок для "Горячего"
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // Сырой SQL-запрос для сортировки по "горячему"
            const hotPosts: { id: string }[] = await prisma.$queryRaw`
                SELECT p.id,
                    -- Формула Reddit Hot Ranking
                    LOG(GREATEST(ABS(
                        (SELECT COUNT(*) FROM "Vote" v WHERE v."postId" = p.id AND v.type = 'UP') -
                        (SELECT COUNT(*) FROM "Vote" v WHERE v."postId" = p.id AND v.type = 'DOWN')
                    ), 1)) *
                    SIGN(
                        (SELECT COUNT(*) FROM "Vote" v WHERE v."postId" = p.id AND v.type = 'UP') -
                        (SELECT COUNT(*) FROM "Vote" v WHERE v."postId" = p.id AND v.type = 'DOWN')
                    ) +
                    EXTRACT(EPOCH FROM p."createdAt") / 45000 AS score
                FROM "Post" p
                WHERE p."createdAt" >= ${sevenDaysAgo}
                ORDER BY score DESC
                LIMIT ${POSTS_PER_PAGE}
                OFFSET ${(page - 1) * POSTS_PER_PAGE};
            `;

            const postIds = hotPosts.map((p) => p.id);

            // Дозагружаем полные данные для найденных постов
            const postsWithRelations = await prisma.post.findMany({
                where: { id: { in: postIds } },
                include: {
                    author: { select: { username: true, id: true } },
                    community: { select: { slug: true } },
                    votes: true,
                },
            });

            // Восстанавливаем правильный порядок, так как findMany его сбивает
            posts = postIds
                .map((id) => postsWithRelations.find((p) => p.id === id))
                .filter(Boolean);
        } else {
            // 'new'
            // Для ленты "Новое" просто берем все посты
            posts = await prisma.post.findMany({
                take: POSTS_PER_PAGE,
                skip: (page - 1) * POSTS_PER_PAGE,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    author: { select: { username: true, id: true } },
                    community: { select: { slug: true } },
                    votes: true,
                },
            });
        }

        return res.status(200).json(posts);
    } catch (error) {
        // Если токен невалидный, verify выбросит ошибку, и мы вернем пустой массив
        if (error instanceof Error && error.name === "JsonWebTokenError") {
            return res.status(200).json([]);
        }
        console.error("Feed error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
