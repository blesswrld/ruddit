"use client"; // Директива для Next.js, что это клиентский компонент

import { useAppSelector } from "@/store/hooks";
import { openLoginModal } from "@/store/slices/authSlice";
import { ArrowBigDown, ArrowBigUp } from "lucide-react"; // Красивые иконки
import { useState } from "react";
import { useDispatch } from "react-redux";

type Vote = {
    type: "UP" | "DOWN";
    userId: string;
};

type VoteClientProps = {
    initialVotes: Vote[];
    postId: string;
};

export const VoteClient = ({ initialVotes, postId }: VoteClientProps) => {
    const dispatch = useDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [votes, setVotes] = useState(initialVotes);

    // Вычисляем текущий голос пользователя
    const currentUserVote = votes.find((vote) => vote.userId === user?.id);

    // Вычисляем общий рейтинг
    const totalVotes = votes.reduce((acc, vote) => {
        if (vote.type === "UP") return acc + 1;
        if (vote.type === "DOWN") return acc - 1;
        return acc;
    }, 0);

    const handleVote = async (voteType: "UP" | "DOWN") => {
        if (!isAuthenticated) {
            dispatch(openLoginModal());
            return;
        }

        // Оптимистичное обновление
        if (currentUserVote?.type === voteType) {
            // Отмена голоса
            setVotes(votes.filter((vote) => vote.userId !== user!.id));
        } else {
            // Добавление или изменение голоса
            setVotes([
                ...votes.filter((vote) => vote.userId !== user!.id),
                { type: voteType, userId: user!.id },
            ]);
        }

        // Отправка запроса на сервер
        await fetch("/api/posts/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId, voteType }),
            credentials: "include",
        });
        // Здесь можно добавить обработку ошибок, если нужно
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={() => handleVote("UP")}
                className={`p-1 rounded-md ${
                    currentUserVote?.type === "UP"
                        ? "text-green-500 bg-green-100"
                        : "text-gray-500 hover:bg-gray-100"
                }`}
            >
                <ArrowBigUp className="h-5 w-5" />
            </button>
            <span className="font-bold text-gray-800">{totalVotes}</span>
            <button
                onClick={() => handleVote("DOWN")}
                className={`p-1 rounded-md ${
                    currentUserVote?.type === "DOWN"
                        ? "text-red-500 bg-red-100"
                        : "text-gray-500 hover:bg-gray-100"
                }`}
            >
                <ArrowBigDown className="h-5 w-5" />
            </button>
        </div>
    );
};
