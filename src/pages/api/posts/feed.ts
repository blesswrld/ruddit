import { PrismaClient, Post, Vote, Image } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { verify } from "jsonwebtoken";

const prisma = new PrismaClient();
const POSTS_PER_PAGE = 5; // Определяем, сколько постов на одной "странице"

// Определяем тип для JWT
interface JwtPayload {
    userId: string;
}

// Кастомный тип, который будет возвращать наш API
type PostWithRelations = Post & {
    author: { username: string | null; id: string };
    community: { slug: string };
    votes: Vote[];
    images: Image[];
};

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
        let posts: (PostWithRelations | undefined)[] = [];

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
                    images: true,
                },
            });
        } else if (feedType === "hot") {
            // Блок для "Горячего"
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

            // 1. Получаем все посты за последнюю неделю с их голосами
            const allPosts = await prisma.post.findMany({
                where: { createdAt: { gte: sevenDaysAgo } },
                include: { votes: true },
            });

            // 2. Считаем рейтинг и "очки горячего" для каждого поста
            const scoredPosts = allPosts.map((post) => {
                const score = post.votes.reduce((acc, vote) => {
                    return acc + (vote.type === "UP" ? 1 : -1);
                }, 0);

                const hoursAgo =
                    (Date.now() - new Date(post.createdAt).getTime()) /
                    (1000 * 60 * 60);
                // Простая формула: Рейтинг / (Возраст в часах + 2)^1.8
                const hotScore = (score - 1) / Math.pow(hoursAgo + 2, 1.8);

                return { ...post, hotScore };
            });

            // 3. Сортируем по "горячему"
            scoredPosts.sort((a, b) => b.hotScore - a.hotScore);

            // 4. Берем нужную "страницу" ID-шников
            const paginatedPostIds = scoredPosts
                .slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)
                .map((p) => p.id);

            // 5. Загружаем полные данные в правильном порядке
            if (paginatedPostIds.length > 0) {
                const postsWithRelations = await prisma.post.findMany({
                    where: { id: { in: paginatedPostIds } },
                    include: {
                        author: { select: { username: true, id: true } },
                        community: { select: { slug: true } },
                        votes: true,
                        images: true,
                    },
                });
                posts = paginatedPostIds.map((id) =>
                    postsWithRelations.find((p) => p.id === id)
                );
            }
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
                    images: true,
                },
            });
        }

        return res.status(200).json(posts.filter(Boolean));
    } catch (error) {
        // Если токен невалидный, verify выбросит ошибку, и мы вернем пустой массив
        if (error instanceof Error && error.name === "JsonWebTokenError") {
            return res.status(200).json([]);
        }
        console.error("Feed error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
