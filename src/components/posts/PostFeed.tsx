import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { PostCard, type PostForCard } from "./PostCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { PostSkeleton } from "./PostSkeleton";
import Link from "next/link";
import { useState, useEffect } from "react";

const POSTS_PER_PAGE = 5;

// Функцию-фетчер, принимает `feedType`
const fetchPosts = async ({
    pageParam = 1,
    queryKey,
}: {
    pageParam?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryKey: any[];
}) => {
    const [, feedType] = queryKey; // Получаем feedType из ключа запроса
    const { data } = await axios.get(
        `/api/posts/feed?page=${pageParam}&feedType=${feedType}`
    );
    return data as PostForCard[];
};

type PostFeedProps = {
    initialPosts: PostForCard[];
};

export const PostFeed = ({ initialPosts }: PostFeedProps) => {
    const { isAuthenticated, status: authStatus } = useAppSelector(
        (state) => state.auth // TypeScript знает тип 'state' благодаря useAppSelector
    );
    const [activeFeed, setActiveFeed] = useState<"subscribed" | "new">(
        "subscribed"
    );

    // Эффект для автоматического переключения на "Новое", если пользователь разлогинился
    useEffect(() => {
        if (authStatus === "succeeded" && !isAuthenticated) {
            setActiveFeed("new");
        }
    }, [authStatus, isAuthenticated]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading, // isLoading от React Query для отслеживания первой загрузки
    } = useInfiniteQuery({
        queryKey: ["posts", activeFeed], // Ключ теперь зависит от активной вкладки
        queryFn: fetchPosts,
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < POSTS_PER_PAGE) return undefined;
            return allPages.length + 1;
        },
        initialData:
            activeFeed === "new"
                ? { pages: [initialPosts], pageParams: [1] }
                : undefined,
        enabled: !!(isAuthenticated || activeFeed === "new"),
    });

    const { setTarget } = useIntersectionObserver({
        onIntersect: () => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    const posts = data?.pages.flatMap((page) => page) ?? [];

    const FeedTabs = () => (
        <div className="mb-4 border-b">
            <nav className="-mb-px flex space-x-8">
                <button
                    onClick={() => setActiveFeed("subscribed")}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                        activeFeed === "subscribed"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                    Моя лента
                </button>
                <button
                    onClick={() => setActiveFeed("new")}
                    className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                        activeFeed === "new"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    }`}
                >
                    Новое
                </button>
            </nav>
        </div>
    );

    // Если идет первоначальная проверка сессии, показываем скелетоны
    if (authStatus === "loading") {
        return (
            <div className="flex flex-col gap-4">
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
            </div>
        );
    }

    return (
        <>
            {isAuthenticated ? (
                <FeedTabs />
            ) : (
                <h1 className="mb-4 text-2xl font-bold">Новое</h1>
            )}

            {/* Если идет первая загрузка данных для выбранной вкладки (например, переключились на пустую "Мою ленту") */}
            {isLoading && (
                <div className="flex flex-col gap-4">
                    <PostSkeleton />
                    <PostSkeleton />
                    <PostSkeleton />
                </div>
            )}

            {/* Если загрузка завершена и постов нет */}
            {!isLoading && posts.length === 0 && (
                <div className="text-center text-gray-500">
                    {activeFeed === "subscribed" && isAuthenticated ? (
                        <>
                            <p>Ваша лента пуста.</p>
                            <p className="mt-2">
                                <Link
                                    href="/communities"
                                    className="text-blue-600 hover:underline"
                                >
                                    Вступите в сообщества
                                </Link>
                                , чтобы видеть здесь посты.
                            </p>
                        </>
                    ) : (
                        <p>Пока здесь нет ни одного поста.</p>
                    )}
                </div>
            )}

            {/* Отображаем посты */}
            {!isLoading && posts.length > 0 && (
                <div className="flex flex-col gap-4">
                    {posts.map((post, index) => {
                        if (index === posts.length - 1) {
                            return (
                                <div key={post.id} ref={setTarget}>
                                    <PostCard post={post} />
                                </div>
                            );
                        }
                        return <PostCard key={post.id} post={post} />;
                    })}
                </div>
            )}

            {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            )}

            {!hasNextPage && posts.length > 0 && !isFetchingNextPage && (
                <p className="text-center text-gray-500 py-4">
                    Вы посмотрели все посты.
                </p>
            )}
        </>
    );
};
