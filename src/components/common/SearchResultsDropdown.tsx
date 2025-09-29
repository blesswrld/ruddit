import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type SearchResult = {
    id: string;
    slug: string;
    name: string;
    _count: {
        subscribers: number;
    };
};

const fetchResults = async (query: string) => {
    if (query.trim() === "") {
        return [];
    }
    const { data } = await axios.get(`/api/search?q=${query}`);
    return data as SearchResult[];
};

type SearchResultsDropdownProps = {
    query: string;
    closeDropdown: () => void; // Функция для закрытия списка
};

export const SearchResultsDropdown = ({
    query,
    closeDropdown,
}: SearchResultsDropdownProps) => {
    const { data: results, isLoading } = useQuery({
        queryKey: ["search", query], // Ключ включает сам запрос
        queryFn: () => fetchResults(query),
        enabled: query.length > 1, // Запрос выполняется, только если введено больше 1 символа
    });

    if (isLoading) {
        return (
            <div className="absolute top-full mt-2 w-full rounded-md border bg-white p-4 text-center shadow-lg">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!results || results.length === 0) {
        return (
            <div className="absolute top-full mt-2 w-full rounded-md border bg-white p-4 text-center text-sm text-gray-500 shadow-lg">
                Ничего не найдено.
            </div>
        );
    }

    return (
        <div className="absolute top-full mt-2 w-full rounded-md border bg-white shadow-lg">
            <div className="flex flex-col">
                {results.map((community) => (
                    <Link
                        key={community.id}
                        href={`/s/${community.slug}`}
                        onClick={closeDropdown} // Закрываем список при клике на результат
                        className="px-4 py-3 hover:bg-gray-100"
                    >
                        <p className="font-semibold">с/{community.name}</p>
                        <p className="text-xs text-gray-500">
                            {community._count.subscribers} подписчиков
                        </p>
                    </Link>
                ))}
                {/* Ссылка на полную страницу результатов */}
                <Link
                    href={`/search?q=${encodeURIComponent(query)}`}
                    onClick={closeDropdown}
                    className="border-t bg-gray-50 px-4 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-gray-100"
                >
                    Показать все результаты для &quot;{query}&quot;
                </Link>
            </div>
        </div>
    );
};
