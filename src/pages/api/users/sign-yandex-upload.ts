import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const s3Client = new S3Client({
    region: process.env.YANDEX_REGION!,
    endpoint: "https://storage.yandexcloud.net",
    credentials: {
        accessKeyId: process.env.YANDEX_ACCESS_KEY_ID!,
        secretAccessKey: process.env.YANDEX_SECRET_ACCESS_KEY!,
    },
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    try {
        const { filename, contentType, folder = "avatars" } = req.body;

        // Генерируем уникальное имя файла, чтобы избежать перезаписи
        const randomString = crypto.randomBytes(8).toString("hex");
        // Используем 'folder' для пути
        const key = `${folder}/${randomString}-${filename}`;

        const command = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_YANDEX_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 60 * 5, // Ссылка действует 5 минут
        });

        // Формируем публичный URL, который мы сохраним в БД
        const publicUrl = `https://${process.env.NEXT_PUBLIC_YANDEX_BUCKET_NAME}.storage.yandexcloud.net/${key}`;

        res.status(200).json({ signedUrl, publicUrl });
    } catch (error) {
        console.error("Error creating signed URL:", error);
        res.status(500).json({ message: "Failed to create signed URL" });
    }
}
