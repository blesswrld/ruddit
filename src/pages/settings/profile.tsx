import { Button } from "@/components/common/Button";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateUserProfile } from "@/store/slices/authSlice";

export default function ProfileSettingsPage() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user, isAuthenticated, status } = useAppSelector(
        (state) => state.auth
    );

    const [bio, setBio] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Заполняем форму текущими данными пользователя, когда они загрузятся
    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
        }
    }, [user]);

    // Защита страницы: если юзер не залогинен, перекидываем на главную
    useEffect(() => {
        // Ждем, пока проверка аутентификации завершится
        if (status === "succeeded" && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, status, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage("");

        let uploadedAvatarUrl = user?.avatarUrl;

        // 1. Если выбран новый файл, загружаем его
        if (file) {
            try {
                // 1.1 Получаем pre-signed URL и publicUrl с нашего бэкенда
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

                // 1.2 Загружаем файл напрямую в Yandex Storage
                const uploadResponse = await fetch(signedUrl, {
                    method: "PUT",
                    body: file,
                    headers: {
                        "Content-Type": file.type,
                    },
                });
                if (!uploadResponse.ok)
                    throw new Error("Не удалось загрузить файл в хранилище.");

                uploadedAvatarUrl = publicUrl;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                setMessage(`Ошибка при загрузке аватара: ${error.message}`);
                setIsLoading(false);
                return;
            }
        }

        // 2. Сохраняем bio и новый URL аватара в нашей базе
        try {
            const response = await fetch("/api/users/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatarUrl: uploadedAvatarUrl, bio }),
                credentials: "include",
            });
            if (!response.ok) throw new Error("Не удалось обновить профиль.");

            const updatedUser = await response.json();
            dispatch(updateUserProfile(updatedUser));

            setMessage("Профиль успешно обновлен!");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setMessage(`Ошибка при сохранении: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Пока идет проверка, ничего не показываем
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
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        maxLength={210} // Добавляем атрибут maxLength
                    />
                    {/* Добавляем счетчик символов */}
                    <p
                        className={`mt-1 text-xs ${
                            bio.length >= 210 ? "text-red-500" : "text-gray-500"
                        }`}
                    >
                        {bio.length} / 210
                    </p>
                </div>

                {message && <p className="text-sm text-green-600">{message}</p>}

                <div className="flex justify-end">
                    <Button
                        type="submit"
                        // Блокируем кнопку, если превышен лимит
                        disabled={isLoading || bio.length > 210}
                        className="w-auto"
                    >
                        {isLoading ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
