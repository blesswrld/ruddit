import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Устанавливаем таймер, который обновит значение после задержки
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Сбрасываем таймер, если значение изменилось (например, пользователь продолжает печатать)
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Эффект перезапускается только если value или delay изменились

    return debouncedValue;
}
