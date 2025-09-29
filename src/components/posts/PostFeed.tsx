import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { PostCard, type PostForCard } from "./PostCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";

const POSTS_PER_PAGE = 5;

// 1. Функцию-фетчер, принимает `feedType`
const fetchPosts = async ({
    pageParam = 1,
    queryKey,
}: {
    pageParam?: number;
    queryKey: (string | undefined)[];
}) => {
    const [, feedType] = queryKey; // Получаем feedType из ключа запроса
    const { data } = await axios.get(
        `/api/posts/feed?page=${pageParam}&feedType=${feedType}`
    );
    return data as PostForCard[];
};

type PostFeedProps = {
    initialPosts: PostForCard[];
    feedType: "new" | "subscribed"; // 2. Добавляем новый пропс
};

export const PostFeed = ({ initialPosts, feedType }: PostFeedProps) => {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useInfiniteQuery({
            // 3. Ключ запроса теперь включает feedType.
            // React Query будет хранить кеш для каждой ленты отдельно.
            queryKey: ["posts", feedType],
            queryFn: fetchPosts,
            initialPageParam: 1,
            getNextPageParam: (lastPage, allPages) => {
                if (lastPage.length < POSTS_PER_PAGE) {
                    return undefined;
                }
                return allPages.length + 1;
            },
            // 4. Используем initialData только для ленты "new", для "subscribed" начинаем с нуля
            initialData:
                feedType === "new"
                    ? { pages: [initialPosts], pageParams: [1] }
                    : undefined,
            enabled: !!(isAuthenticated || feedType === "new"), // Включаем запрос для "subscribed" только если пользователь залогинен
        });

    const { setTarget } = useIntersectionObserver({
        onIntersect: () => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    const posts = data?.pages.flatMap((page) => page) ?? [];

    // Специальное сообщение, если лента подписок пуста
    if (
        feedType === "subscribed" &&
        posts.length === 0 &&
        !isFetchingNextPage &&
        !hasNextPage
    ) {
        return (
            <div className="text-center text-gray-500">
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
            </div>
        );
    }

    return (
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

            {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
            )}

            {!hasNextPage && posts.length > 0 && (
                <p className="text-center text-gray-500 py-4">
                    Вы посмотрели все посты.
                </p>
            )}
        </div>
    );
};
