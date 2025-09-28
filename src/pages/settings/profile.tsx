import { Button } from "@/components/common/Button";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";

export default function ProfileSettingsPage() {
    const router = useRouter();
    const { user, isAuthenticated, status } = useAppSelector(
        (state) => state.auth
    );

    const [bio, setBio] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) setBio(user.bio || "");
    }, [user]);

    useEffect(() => {
        if (status === "succeeded" && !isAuthenticated) router.push("/");
    }, [isAuthenticated, status, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        let uploadedAvatarUrl = user?.avatarUrl;

        if (file) {
            try {
                // 1. Получаем pre-signed URL с нашего бэкенда
                const signResponse = await fetch(
                    "/api/users/sign-yandex-upload",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: file.name,
                            contentType: file.type,
                        }),
                    }
                );
                if (!signResponse.ok)
                    throw new Error("Не удалось получить ссылку для загрузки.");

                const { signedUrl, publicUrl } = await signResponse.json();

                // 2. Загружаем файл напрямую в Yandex Storage
                const uploadResponse = await fetch(signedUrl, {
                    method: "PUT",
                    body: file,
                    headers: {
                        "Content-Type": file.type,
                    },
                });
                if (!uploadResponse.ok)
                    throw new Error("Не удалось загрузить файл в хранилище.");

                uploadedAvatarUrl = publicUrl; // Получаем публичный URL
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                setMessage(`Ошибка при загрузке аватара: ${error.message}`);
                setIsLoading(false);
                return;
            }
        }

        // 3. Сохраняем bio и новый URL аватара в нашей базе
        try {
            const response = await fetch("/api/users/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: uploadedAvatarUrl, bio }),
                credentials: "include",
            });
            if (!response.ok) throw new Error("Не удалось обновить профиль.");

            setMessage("Профиль успешно обновлен!");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setTimeout(() => router.reload(), 1500);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setMessage(`Ошибка при сохранении: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (status !== "succeeded") {
        return <div className="container mx-auto p-6">Загрузка...</div>;
    }

    return (
        <div className="mx-auto max-w-2xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-4 text-2xl font-bold">Настройки профиля</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Аватар
                    </label>
                    <div className="flex items-center gap-4">
                        {/*  eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={
                                file
                                    ? URL.createObjectURL(file)
                                    : user?.avatarUrl || "/default-avatar.png"
                            }
                            alt="Текущий аватар"
                            className="h-20 w-20 rounded-full object-cover"
                        />
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleFileChange}
                            disabled={isLoading}
                            ref={fileInputRef}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </div>
                </div>
                <div>
                    <label
                        htmlFor="user-bio"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        О себе
                    </label>
                    <textarea
                        id="user-bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm"
                        placeholder="Расскажите немного о себе..."
                        disabled={isLoading}
                    />
                </div>

                {message && <p className="text-sm text-green-600">{message}</p>}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-auto"
                    >
                        {isLoading ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
