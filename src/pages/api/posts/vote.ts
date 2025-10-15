import { PrismaClient, VoteType } from "@prisma/client";
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
        const { postId, voteType } = req.body as {
            postId: string;
            voteType: VoteType;
        };

        if (!postId || !voteType) {
            return res
                .status(400)
                .json({ message: "Post ID and vote type are required" });
        }

        const existingVote = await prisma.vote.findUnique({
            where: {
                userId_postId: {
                    userId,
                    postId,
                },
            },
        });

        // Загружаем пост, чтобы узнать ID его автора
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { authorId: true },
        });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (existingVote) {
            // Если пользователь кликает на ту же кнопку, отменяем голос
            if (existingVote.type === voteType) {
                await prisma.vote.delete({
                    where: {
                        userId_postId: {
                            userId,
                            postId,
                        },
                    },
                });
                return res.status(200).json({ message: "Vote removed" });
            } else {
                // Если пользователь кликает на другую кнопку, меняем голос
                await prisma.vote.update({
                    where: {
                        userId_postId: {
                            userId,
                            postId,
                        },
                    },
                    data: { type: voteType },
                });
                // Уведомляем об апвоуте при смене с даунвоута
                if (voteType === "UP" && post.authorId !== userId) {
                    await prisma.notification.create({
                        data: {
                            type: "POST_UPVOTE",
                            recipientId: post.authorId,
                            senderId: userId,
                            postId: postId,
                        },
                    });
                }
                return res.status(200).json({ message: "Vote updated" });
            }
        } else {
            // Если голоса нет, создаем новый
            await prisma.vote.create({
                data: {
                    type: voteType,
                    userId,

                    postId,
                },
            });
            // Уведомляем об апвоуте при первом голосовании
            if (voteType === "UP" && post.authorId !== userId) {
                await prisma.notification.create({
                    data: {
                        type: "POST_UPVOTE",
                        recipientId: post.authorId,
                        senderId: userId,
                        postId: postId,
                    },
                });
            }
            return res.status(201).json({ message: "Vote created" });
        }
    } catch (error) {
        console.error("Vote error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
