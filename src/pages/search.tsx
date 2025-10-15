import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/router";

const prisma = new PrismaClient();
const RESULTS_PER_PAGE = 10;

// 1. Определяем тип для одного элемента (сообщества)
type CommunitySearchResult = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    _count: {
        subscribers: number;
    };
};

// 2. Определяем тип для пользователя
type UserSearchResult = {
    username: string;
    avatarUrl: string | null;
    createdAt: string;
};

// getServerSideProps теперь загружает только ПЕРВУЮ страницу результатов
export const getServerSideProps: GetServerSideProps = async (context) => {
    const { q, type = "communities" } = context.query;

    if (typeof q !== "string" || q.trim() === "") {
        return {
            props: { initialResults: [], query: "", type: "communities" },
        };
    }

    let results;
    if (type === "users") {
        results = await prisma.user.findMany({
            where: { username: { contains: q, mode: "insensitive" } },
            select: { username: true, avatarUrl: true, createdAt: true },
            take: RESULTS_PER_PAGE,
        });
    } else {
        results = await prisma.community.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ],
            },
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                imageUrl: true,
                _count: {
                    select: {
                        subscribers: true,
                    },
                },
            },
            take: RESULTS_PER_PAGE,
            orderBy: { subscribers: { _count: "desc" } },
        });
    }

    return {
        props: {
            initialResults: JSON.parse(JSON.stringify(results)),
            query: q,
            type, // Передаем `type` на клиент
        },
    };
};

// 3. Функция-фетчер для React Query
const fetchSearchResults = async ({
    pageParam = 1,
    queryKey,
}: {
    pageParam?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryKey: any[];
}) => {
    const [, query, type] = queryKey;
    // Передаем `type` в API запрос
    const { data } = await axios.get(
        `/api/search-paginated?q=${query}&type=${type}&page=${pageParam}`
    );
    return data;
};

export default function SearchPage({
    initialResults,
    query,
    type, // Принимаем `type` из пропсов
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const router = useRouter(); // Инициализируем роутер

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ["search-results", query, type],
            queryFn: fetchSearchResults,
            initialPageParam: 1,
            getNextPageParam: (lastPage, allPages) => {
                if (!lastPage || lastPage.length < RESULTS_PER_PAGE) {
                    return undefined;
                }
                return allPages.length + 1;
            },
            initialData: { pages: [initialResults], pageParams: [1] },
        });

    const { setTarget } = useIntersectionObserver({
        onIntersect: () => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    const results = data?.pages.flatMap((page) => page) ?? initialResults;

    // Функция для смены вкладок
    const handleTabChange = (newType: "communities" | "users") => {
        router.push(`/search?q=${query}&type=${newType}`);
    };

    return (
        <div className="container mx-auto max-w-4xl py-6">
            <h1 className="text-2xl font-bold">
                Результаты поиска по запросу:{" "}
                <span className="text-blue-600">&quot;{query}&quot;</span>
            </h1>

            {/* Добавляем рендер вкладок */}
            <div className="mt-4 border-b">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => handleTabChange("communities")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            type === "communities"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Сообщества
                    </button>
                    <button
                        onClick={() => handleTabChange("users")}
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            type === "users"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Пользователи
                    </button>
                </nav>
            </div>

            <div className="mt-6 flex flex-col gap-4">
                {results.length > 0 ? (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    results.map((item: any, index) => {
                        // Условный рендер карточек
                        const card =
                            type === "users" ? (
                                <UserCard key={item.username} user={item} />
                            ) : (
                                <CommunityCard key={item.id} community={item} />
                            );

                        if (index === results.length - 1) {
                            // eslint-disable-next-line react/jsx-key
                            return <div ref={setTarget}>{card}</div>;
                        }
                        return card;
                    })
                ) : (
                    <p className="text-center text-gray-500">
                        По вашему запросу ничего не найдено.
                    </p>
                )}
                {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    </div>
                )}
                {!hasNextPage && results.length > 0 && (
                    <p className="text-center text-gray-500 py-4">
                        Вы посмотрели все результаты.
                    </p>
                )}
            </div>
        </div>
    );
}

// 4. Выносим карточку сообщества в отдельный компонент для чистоты
const CommunityCard = ({ community }: { community: CommunitySearchResult }) => (
    <Link
        href={`/s/${community.slug}`}
        className="block rounded-lg border bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
    >
        <div className="flex items-center gap-4">
            {community.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={community.imageUrl}
                    alt="avatar"
                    className="h-10 w-10 rounded-full object-cover"
                />
            ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                    с/
                </div>
            )}
            <div>
                <h2 className="text-xl font-bold text-gray-800 break-all">
                    с/{community.name}
                </h2>
                <p className="mt-1 text-sm text-gray-600 break-all">
                    {community.description || "Нет описания"}
                </p>
                <p className="mt-2 text-xs text-gray-500 break-all">
                    {community._count.subscribers} подписчиков
                </p>
            </div>
        </div>
    </Link>
);

// Компонент для карточки пользователя
const UserCard = ({ user }: { user: UserSearchResult }) => (
    <Link
        href={`/u/${user.username}`}
        className="block rounded-lg border bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
    >
        <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={user.avatarUrl || "/default-avatar.png"}
                alt="avatar"
                className="h-12 w-12 rounded-full"
            />
            <div>
                <h2 className="font-bold text-lg">п/{user.username}</h2>
                <p className="text-xs text-gray-500">
                    на Ruddit с{" "}
                    {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </p>
            </div>
        </div>
    </Link>
);
