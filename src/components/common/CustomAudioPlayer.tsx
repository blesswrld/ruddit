"use client";

import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const CustomAudioPlayer = ({
    src,
    trackName,
}: {
    src: string;
    trackName: string;
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // Оборачиваем функции в useCallback
    const togglePlayPause = useCallback(() => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying((prev) => !prev);
    }, [isPlaying]);

    // Функция для перемотки
    const skipTime = useCallback((amount: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += amount;
        }
    }, []);

    // Функция для мута
    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Обработчик горячих клавиш
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Проверяем что фокус не на текстовом поле
            if (
                document.activeElement?.tagName === "INPUT" ||
                document.activeElement?.tagName === "TEXTAREA"
            ) {
                return;
            }
            switch (e.key) {
                case " ":
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case "ArrowRight":
                    skipTime(5);
                    break;
                case "ArrowLeft":
                    skipTime(-5);
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [togglePlayPause, skipTime]); // Добавляем isPlaying, чтобы togglePlayPause всегда был актуальным

    // Обновляем и состояние, и значение прогресс-бара
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const timeUpdateHandler = () => setCurrentTime(audio.currentTime);
        const loadedMetadataHandler = () => setDuration(audio.duration);
        const endedHandler = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", timeUpdateHandler);
        audio.addEventListener("loadedmetadata", loadedMetadataHandler);
        audio.addEventListener("ended", endedHandler); // Сбрасываем isPlaying, когда трек закончился

        return () => {
            audio.removeEventListener("timeupdate", timeUpdateHandler);
            audio.removeEventListener("loadedmetadata", loadedMetadataHandler);
            audio.removeEventListener("ended", endedHandler);
        };
    }, []);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Number(e.target.value);
            setCurrentTime(Number(e.target.value)); // Обновляем состояние сразу
        }
    };

    return (
        <div className="relative flex w-full items-center gap-4 rounded-full bg-gray-100 p-2 shadow-inner">
            <audio
                ref={audioRef}
                src={src}
                muted={isMuted}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            ></audio>

            <button
                onClick={togglePlayPause}
                className="flex-shrink-0 rounded-full p-2 hover:bg-gray-200 z-10"
            >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            {/* Контейнер для прогресс-бара и текста */}
            <div className="relative flex-grow flex items-center gap-2">
                <span className="text-xs font-mono w-10 text-right z-10">
                    {formatTime(currentTime)}
                </span>

                {/* Отдельный контейнер для бара и текста поверх него */}
                <div className="relative w-full flex items-center">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1" // Для более плавной прокрутки
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    {/* Текст спозиционирован абсолютно относительно этого контейнера */}
                    <div className="absolute -mt-9 inset-0 flex items-start pointer-events-none pt-3">
                        <p className="text-xs font-semibold text-gray-700 select-none">
                            {trackName}
                        </p>
                    </div>
                </div>

                <span className="text-xs font-mono w-10 z-10">
                    {formatTime(duration)}
                </span>
            </div>

            <button
                onClick={toggleMute}
                className="flex-shrink-0 rounded-full p-2 hover:bg-gray-200 z-10"
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
        </div>
    );
};
