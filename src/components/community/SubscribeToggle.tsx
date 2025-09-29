"use client";

import { useState } from "react";
import { Button } from "../common/Button";

type SubscribeToggleProps = {
    initialIsSubscribed: boolean;
    communityId: string;
};

export const SubscribeToggle = ({
    initialIsSubscribed,
    communityId,
}: SubscribeToggleProps) => {
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
        // Можно добавить router.reload() для синхронизации счетчика, но пока оставим так
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
