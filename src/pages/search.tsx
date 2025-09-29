import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";

const prisma = new PrismaClient();
const RESULTS_PER_PAGE = 10;

// 1. Определяем тип для одного элемента
type SearchResult = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    _count: {
        subscribers: number;
    };
};

// 2. getServerSideProps теперь загружает только ПЕРВУЮ страницу результатов
export const getServerSideProps: GetServerSideProps = async (context) => {
    const { q } = context.query;

    if (typeof q !== "string" || q.trim() === "") {
        return { props: { results: [], query: "" } };
    }

    const results = await prisma.community.findMany({
        where: {
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
            ],
        },
        include: {
            _count: { select: { subscribers: true } },
        },
        take: RESULTS_PER_PAGE,
        skip: 0,
    });

    return {
        props: {
            initialResults: JSON.parse(JSON.stringify(results)),
            query: q,
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
    const [, query] = queryKey;
    const { data } = await axios.get(
        `/api/search?q=${query}&page=${pageParam}`
    );
    return data as SearchResult[];
};

export default function SearchPage({
    initialResults,
    query,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            queryKey: ["search-results", query],
            queryFn: fetchSearchResults,
            initialPageParam: 1,
            getNextPageParam: (lastPage, allPages) => {
                if (lastPage.length < RESULTS_PER_PAGE) {
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

    return (
        <div className="container mx-auto max-w-4xl py-6">
            <h1 className="text-2xl font-bold">
                Результаты поиска по запросу:{" "}
                <span className="text-blue-600">&quot;{query}&quot;</span>
            </h1>

            <div className="mt-6 flex flex-col gap-4">
                {results.length > 0 ? (
                    results.map((community, index) => {
                        if (index === results.length - 1) {
                            return (
                                <div key={community.id} ref={setTarget}>
                                    <CommunityCard community={community} />
                                </div>
                            );
                        }
                        return (
                            <CommunityCard
                                key={community.id}
                                community={community}
                            />
                        );
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
const CommunityCard = ({ community }: { community: SearchResult }) => (
    <Link
        href={`/s/${community.slug}`}
        className="block rounded-lg border bg-white p-4 shadow-sm transition hover:border-blue-500 hover:shadow-md"
    >
        <h2 className="text-xl font-bold text-gray-800">с/{community.name}</h2>
        <p className="mt-1 text-sm text-gray-600">
            {community.description || "Нет описания"}
        </p>
        <p className="mt-2 text-xs text-gray-500">
            {community._count.subscribers} подписчиков
        </p>
    </Link>
);
