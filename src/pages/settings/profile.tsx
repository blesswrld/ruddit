import { Button } from "@/components/common/Button";
import { useAppSelector } from "@/store/hooks";
import { useRouter } from "next/router";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { updateUserProfile } from "@/store/slices/authSlice";
import { Input } from "@/components/common/Input";
import toast from "react-hot-toast";

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

    const [musicFile, setMusicFile] = useState<File | null>(null);
    const musicFileInputRef = useRef<HTMLInputElement>(null);

    // Состояние для всех ссылок
    const [links, setLinks] = useState({
        telegram: "",
        instagram: "",
        youTube: "",
        tikTok: "",
        customName: "",
        customUrl: "",
    });

    const [bannerColor, setBannerColor] = useState("");

    // Функция для сброса формы к начальным данным
    const resetForm = useCallback(() => {
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
            setBannerColor(user.profileBannerColor || "");
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setMessage("");

            setMusicFile(null);
            if (musicFileInputRef.current) musicFileInputRef.current.value = "";
        }
    }, [user]);

    // Заполняем состояние при первой загрузке данных
    useEffect(() => {
        resetForm();
    }, [resetForm]);

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

        // Используем toast.promise для всей цепочки
        const savePromise = (async () => {
            let uploadedAvatarUrl = user?.avatarUrl;
            let uploadedMusicUrl = user?.profileMusicUrl;

            // 1. Если выбран новый аватар, загружаем его
            if (file) {
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
                    throw new Error("Не удалось получить подпись для аватара.");
                const { signedUrl, publicUrl } = await signResponse.json();

                // 1.1 Загружаем файл напрямую в Yandex Storage
                const uploadResponse = await fetch(signedUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });
                if (!uploadResponse.ok)
                    throw new Error("Не удалось загрузить аватар.");
                uploadedAvatarUrl = publicUrl;
            }

            // 2. Если выбран новый трек, загружаем его
            if (musicFile) {
                const signResponse = await fetch(
                    "/api/users/sign-yandex-upload",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            filename: musicFile.name,
                            contentType: musicFile.type,
                            folder: "profile_music",
                        }),
                    }
                );
                if (!signResponse.ok)
                    throw new Error("Не удалось получить подпись для музыки.");
                const { signedUrl, publicUrl } = await signResponse.json();

                const uploadResponse = await fetch(signedUrl, {
                    method: "PUT",
                    body: musicFile,
                    headers: { "Content-Type": musicFile.type },
                });
                if (!uploadResponse.ok)
                    throw new Error("Не удалось загрузить музыку.");
                uploadedMusicUrl = publicUrl;
            }

            // 3. Сохраняем все данные в нашей базе
            const response = await fetch("/api/users/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    avatarUrl: uploadedAvatarUrl,
                    bio,
                    links,
                    profileMusicUrl: uploadedMusicUrl,
                    profileBannerColor: bannerColor,
                }),
                credentials: "include",
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.message || "Не удалось обновить профиль."
                );
            }
            return response.json();
        })();

        toast
            .promise(savePromise, {
                loading: "Сохранение...",
                success: (updatedUser) => {
                    dispatch(updateUserProfile(updatedUser));
                    setMessage("Профиль успешно обновлен!");
                    setFile(null); // Сбрасываем файлы после успеха
                    setMusicFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    if (musicFileInputRef.current)
                        musicFileInputRef.current.value = "";
                    return "Профиль успешно обновлен!";
                },
                error: (err) => {
                    setMessage(`Ошибка: ${err.message}`);
                    return `Ошибка: ${err.message}`;
                },
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleDeleteAccount = async () => {
        if (
            !confirm(
                "Вы уверены, что хотите НАВСЕГДА удалить свой аккаунт? Все ваши посты, комментарии и сообщества будут удалены."
            )
        ) {
            return;
        }
        setIsLoading(true);

        try {
            await fetch("/api/users/delete", {
                method: "POST",
                credentials: "include",
            });
            toast.success("Ваш аккаунт удален.");
            // router.reload() вызовет выход из системы, т.к. cookie удален
            router.reload();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error("Не удалось удалить аккаунт.");
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

                {/* Загрузка музыки */}
                <div className="border-t pt-6">
                    <h2 className="text-lg font-semibold">Музыка в профиле</h2>
                    <p className="text-sm text-gray-500 mb-2">
                        Загрузите один .mp3 файл, который будет играть в вашем
                        профиле.
                    </p>

                    {/* Добавляем текущее имя файла */}
                    <div className="flex items-center gap-4">
                        {/* Иконка музыки */}
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M9 18V5l12-2v13" />
                                <circle cx="6" cy="18" r="3" />
                                <circle cx="18" cy="16" r="3" />
                            </svg>
                        </div>

                        <div className="flex-grow">
                            <label
                                htmlFor="music-file-input"
                                className="cursor-pointer rounded-md bg-white px-3 py-2 text-sm font-semibold text-blue-600 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            >
                                <span>Выберите файл</span>
                                <input
                                    id="music-file-input"
                                    type="file"
                                    accept="audio/mpeg" // Только mp3
                                    onChange={(e) =>
                                        setMusicFile(
                                            e.target.files
                                                ? e.target.files[0]
                                                : null
                                        )
                                    }
                                    disabled={isLoading}
                                    ref={musicFileInputRef}
                                    className="sr-only"
                                />
                            </label>
                            <span className="ml-3 text-sm text-gray-500 break-all">
                                {musicFile?.name ||
                                    (user?.profileMusicUrl
                                        ? "Текущий трек загружен"
                                        : "Файл не выбран")}
                            </span>
                        </div>
                    </div>
                </div>

                {message && <p className="text-sm text-green-600">{message}</p>}

                {/* Добавляем кнопку "Отмена" */}
                <div className="flex justify-end gap-4">
                    <Button
                        type="button" // Важно: type="button", чтобы не отправлять форму
                        onClick={resetForm}
                        disabled={isLoading}
                        variant="secondary"
                        className="w-auto text-black hover:opacity-80"
                    >
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        // Блокируем кнопку, если превышен лимит
                        disabled={isLoading || bio.length > 210}
                        variant="primary"
                        className="w-auto text-black hover:opacity-80 border-none outline-none"
                    >
                        {isLoading ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                </div>
            </form>

            <div className="mt-8 border-t border-red-200 pt-6">
                <h2 className="text-lg font-semibold text-red-700">
                    Опасная зона
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                    Удаление аккаунта — необратимое действие.
                </p>
                <div className="mt-4">
                    <Button
                        onClick={handleDeleteAccount}
                        disabled={isLoading}
                        variant="danger" // Используем наш вариант
                        className="w-auto border-none outline-none"
                    >
                        {isLoading ? "Удаление..." : "Удалить аккаунт"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
