"use client";

import { useState } from "react";
import { Button } from "../common/Button";
import { useRouter } from "next/navigation";

type SubscribeToggleProps = {
    initialIsSubscribed: boolean;
    communityId: string;
};

export const SubscribeToggle = ({
    initialIsSubscribed,
    communityId,
}: SubscribeToggleProps) => {
    const router = useRouter();
    const [isSubscribed, setIsSubscribed] = useState(initialIsSubscribed);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
        setIsLoading(true);

        // Оптимистичное обновление
        setIsSubscribed((prev) => !prev);

        await fetch("/api/communities/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ communityId }),
            credentials: "include",
        });

        setIsLoading(false);

        // Перезагружаем страницу, чтобы обновить счетчик подписчиков
        router.refresh();
    };

    return (
        <Button
            onClick={handleToggle}
            disabled={isLoading}
            className={`w-auto px-6 py-2 text-sm font-bold ${
                isSubscribed
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
        >
            {isSubscribed ? "Покинуть" : "Вступить"}
        </Button>
    );
};
