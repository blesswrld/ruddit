import { Button } from "@/components/common/Button";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateUserProfile } from "@/store/slices/authSlice";
import { Input } from "@/components/common/Input";

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

    // Состояние для всех ссылок
    const [links, setLinks] = useState({
        telegram: "",
        instagram: "",
        youTube: "",
        tikTok: "",
        customName: "",
        customUrl: "",
    });

    // Функция для сброса формы к начальным данным
    const resetForm = () => {
        if (user) {
            setBio(user.bio || "");
            setLinks({
                telegram: user.linkTelegram || "",
                instagram: user.linkInstagram || "",
                youTube: user.linkYouTube || "",
                tikTok: user.linkTikTok || "",
                customName: user.linkCustomName || "",
                customUrl: user.linkCustomUrl || "",
            });
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setMessage("");
        }
    };

    // Заполняем состояние при первой загрузке данных
    useEffect(() => {
        if (user) {
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Заполняем состояние при загрузке данных
    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            setLinks({
                telegram: user.linkTelegram || "",
                instagram: user.linkInstagram || "",
                youTube: user.linkYouTube || "",
                tikTok: user.linkTikTok || "",
                customName: user.linkCustomName || "",
                customUrl: user.linkCustomUrl || "",
            });
        }
    }, [user]);

    // Функция для удобного обновления ссылок
    const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLinks((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

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
                body: JSON.stringify({
                    avatarUrl: uploadedAvatarUrl,
                    bio,
                    links,
                }),
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
            <form
                onSubmit={handleSubmit}
                className={`flex flex-col gap-6 ${
                    isLoading ? "pointer-events-none" : ""
                }`}
            >
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

                {/* Секция для ссылок */}
                <div className="border-t pt-6">
                    <h2 className="text-lg font-semibold mb-4">
                        Социальные сети
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Добавляем disabled={isLoading} ко всем инпутам */}
                        <Input
                            id="link-telegram"
                            name="telegram"
                            label="Telegram"
                            value={links.telegram}
                            onChange={handleLinkChange}
                            placeholder="https://t.me/username"
                            disabled={isLoading}
                        />
                        <Input
                            id="link-instagram"
                            name="instagram"
                            label="Instagram"
                            value={links.instagram}
                            onChange={handleLinkChange}
                            placeholder="https://instagram.com/username"
                            disabled={isLoading}
                        />
                        <Input
                            id="link-youtube"
                            name="youTube"
                            label="YouTube"
                            value={links.youTube}
                            onChange={handleLinkChange}
                            placeholder="https://youtube.com/c/channel"
                            disabled={isLoading}
                        />
                        <Input
                            id="link-tiktok"
                            name="tikTok"
                            label="TikTok"
                            value={links.tikTok}
                            onChange={handleLinkChange}
                            placeholder="https://tiktok.com/@username"
                            disabled={isLoading}
                        />
                    </div>
                    <h3 className="text-md font-semibold mt-6 mb-2">
                        Кастомная ссылка
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            id="link-custom-name"
                            name="customName"
                            label="Название"
                            value={links.customName}
                            onChange={handleLinkChange}
                            placeholder="Мой сайт"
                            disabled={isLoading}
                        />
                        <Input
                            id="link-custom-url"
                            name="customUrl"
                            label="URL"
                            value={links.customUrl}
                            onChange={handleLinkChange}
                            placeholder="https://example.com"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {message && <p className="text-sm text-green-600">{message}</p>}

                {/* Добавляем кнопку "Отмена" */}
                <div className="flex justify-end gap-4">
                    <Button
                        type="button" // Важно: type="button", чтобы не отправлять форму
                        onClick={resetForm}
                        disabled={isLoading}
                        className="w-auto text-black hover:opacity-80"
                    >
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        // Блокируем кнопку, если превышен лимит
                        disabled={isLoading || bio.length > 210}
                        className="w-auto text-black hover:opacity-80"
                    >
                        {isLoading ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
