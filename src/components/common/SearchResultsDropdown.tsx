import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// Тип для сообщества в результатах
type CommunityResult = {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    _count: { subscribers: number };
};

// Тип для пользователя в результатах
type UserResult = {
    username: string;
    avatarUrl: string | null;
};

// Тип для полного ответа от API
type SearchResponse = {
    communities: CommunityResult[];
    users: UserResult[];
};

// Функция-фетчер. Теперь она возвращает объект SearchResponse.
const fetchResults = async (query: string): Promise<SearchResponse> => {
    if (query.trim().length < 2) {
        return { communities: [], users: [] };
    }
    const { data } = await axios.get(`/api/search?q=${query}`);
    return data as SearchResponse;
};

type SearchResultsDropdownProps = {
    query: string;
    closeDropdown: () => void; // Функция для закрытия списка
};

export const SearchResultsDropdown = ({
    query,
    closeDropdown,
}: SearchResultsDropdownProps) => {
    const { data, isLoading } = useQuery({
        queryKey: ["search-dropdown", query], // Ключ включает сам запрос
        queryFn: () => fetchResults(query),
        enabled: query.length > 1, // Запрос выполняется, только если введено больше 1 символа
    });

    const communities = data?.communities || [];
    const users = data?.users || [];
    const hasResults = communities.length > 0 || users.length > 0;

    if (isLoading) {
        return (
            <div className="absolute top-full mt-2 w-full rounded-md border bg-white p-4 text-center shadow-lg">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!isLoading && !hasResults) {
        return (
            <div className="absolute top-full mt-2 w-full rounded-md border bg-white p-4 text-center text-sm text-gray-500 shadow-lg">
                Ничего не найдено.
            </div>
        );
    }

    return (
        <div className="absolute top-full mt-2 w-full rounded-md border bg-white shadow-lg z-20">
            <div className="flex flex-col">
                {/* Секция пользователей */}
                {users.length > 0 && (
                    <div className="p-2">
                        <p className="px-2 text-xs font-bold text-gray-500">
                            Пользователи
                        </p>
                        {users.map((user) => (
                            <Link
                                key={user.username}
                                href={`/u/${user.username}`}
                                onClick={closeDropdown}
                                className="flex items-center gap-2 rounded px-2 py-2 hover:bg-gray-100"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={
                                        user.avatarUrl || "/default-avatar.png"
                                    }
                                    alt="avatar"
                                    className="h-6 w-6 rounded-full"
                                />
                                <span className="text-sm font-semibold">
                                    п/{user.username}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Секция сообществ */}
                {communities.length > 0 && (
                    <div
                        className={`p-2 ${users.length > 0 ? "border-t" : ""}`}
                    >
                        <p className="px-2 text-xs font-bold text-gray-500">
                            Сообщества
                        </p>
                        {communities.map((community) => (
                            <Link
                                key={community.id}
                                href={`/s/${community.slug}`}
                                onClick={closeDropdown}
                                className="flex items-center gap-3 rounded px-2 py-2 hover:bg-gray-100"
                            >
                                {/* Аватар сообщества */}
                                {community.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={community.imageUrl}
                                        alt={`Аватар с/${community.name}`}
                                        className="h-6 w-6 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        <span className="font-bold text-gray-500 text-xs">
                                            с/
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-sm break-all">
                                        с/{community.name}
                                    </p>
                                    <p className="text-xs text-gray-500 break-all">
                                        {community._count.subscribers}{" "}
                                        подписчиков
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

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
