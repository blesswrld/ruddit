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

        // 1. Создаем пустой объект для данных, которые будем обновлять
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataToUpdate: any = {};

        // 2. Проверяем КАЖДОЕ поле. Если оно пришло в запросе, добавляем его в dataToUpdate.
        //    `undefined` означает "не трогать это поле".
        if (bio !== undefined) {
            if (bio.length > 210) {
                return res.status(400).json({
                    message: "Описание не может быть длиннее 210 символов.",
                });
            }
            dataToUpdate.bio = bio;
        }
        if (avatarUrl !== undefined) {
            dataToUpdate.avatarUrl = avatarUrl;
        }
        if (profileMusicUrl !== undefined) {
            dataToUpdate.profileMusicUrl =
                profileMusicUrl === "" ? null : profileMusicUrl;
        }
        if (profileBannerColor !== undefined) {
            dataToUpdate.profileBannerColor =
                profileBannerColor === "" ? null : profileBannerColor;
        }

        if (links) {
            // Валидация
            for (const url of Object.values(links)) {
                if (
                    url &&
                    (typeof url !== "string" ||
                        (!url.startsWith("https://") &&
                            !url.startsWith("http://")))
                ) {
                    // Можно вернуть ошибку, но пока пропустим
                }
            }
            // Добавляем все поля из links в dataToUpdate
            dataToUpdate.linkTelegram = links.telegram || null;
            dataToUpdate.linkInstagram = links.instagram || null;
            dataToUpdate.linkYouTube = links.youTube || null;
            dataToUpdate.linkTikTok = links.tikTok || null;
            dataToUpdate.linkCustomName = links.customName || null;
            dataToUpdate.linkCustomUrl = links.customUrl || null;
        }

        // 3. Выполняем обновление только с теми данными, которые реально пришли
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
        });

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutPassword } = updatedUser;

        return res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
