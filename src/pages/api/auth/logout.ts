import * as cookie from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Мы устанавливаем cookie с тем же именем, но с истекшим сроком жизни
    res.setHeader(
        "Set-Cookie",
        cookie.serialize("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            expires: new Date(0), // Дата в прошлом
            sameSite: "strict",
            path: "/",
        })
    );
    res.status(200).json({ message: "Logged out successfully" });
}
