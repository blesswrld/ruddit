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
        const { bio, avatarUrl, links, profileMusicUrl, profileBannerColor } =
            req.body;

        // Валидация
        if (bio && typeof bio === "string" && bio.length > 210) {
            return res.status(400).json({
                message: "Описание не может быть длиннее 210 символов.",
            });
        }
        if (links) {
            for (const url of Object.values(links)) {
                if (
                    url &&
                    (typeof url !== "string" ||
                        (!url.startsWith("https://") &&
                            !url.startsWith("http://")))
                ) {
                    // Разрешаем и http для гибкости
                }
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                bio: bio,
                avatarUrl: avatarUrl,
                // Сохраняем ссылки
                linkTelegram: links?.telegram || null,
                linkInstagram: links?.instagram || null,
                linkYouTube: links?.youTube || null,
                linkTikTok: links?.tikTok || null,
                linkCustomName: links?.customName || null,
                linkCustomUrl: links?.customUrl || null,

                // Сохраняем ссылку на музыку
                profileMusicUrl: profileMusicUrl,

                // Сохраняем кастомный баннер
                profileBannerColor,
            },
        });

        // Не отправляем хеш пароля обратно
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = updatedUser;

        return res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
