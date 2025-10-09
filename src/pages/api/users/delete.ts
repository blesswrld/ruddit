import { PrismaClient } from "@prisma/client";
import { verify } from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";
import * as cookie from "cookie";

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

        // Prisma автоматически удалит весь связанный контент (посты, комменты, голоса, подписки и т.д.)
        // благодаря `onDelete: Cascade` в схеме.
        await prisma.user.delete({ where: { id: userId } });

        // Очищаем cookie, чтобы завершить сессию
        res.setHeader(
            "Set-Cookie",
            cookie.serialize("token", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV !== "development",
                expires: new Date(0),
                sameSite: "strict",
                path: "/",
            })
        );

        return res
            .status(200)
            .json({ message: "Account deleted successfully" });
    } catch (error) {
        console.error("Account delete error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}
