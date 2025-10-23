import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";
import { PostCard, type PostForCard } from "./PostCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { Loader2 } from "lucide-react";
import { PostSkeleton } from "./PostSkeleton";

const POSTS_PER_PAGE = 5;

// Функция-фетчер для видео
const fetchVideos = async ({ pageParam = 1 }: { pageParam?: number }) => {
    const { data } = await axios.get(`/api/posts/videos?page=${pageParam}`);
    return data as PostForCard[];
};

type VideoFeedProps = {
    initialPosts: PostForCard[];
};

export const VideoFeed = ({ initialPosts }: VideoFeedProps) => {
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
        useInfiniteQuery({
            queryKey: ["videos"], // Уникальный ключ для видеоленты
            queryFn: fetchVideos,
            initialPageParam: 1,
            getNextPageParam: (lastPage, allPages) => {
                if (!lastPage || lastPage.length < POSTS_PER_PAGE) {
                    return undefined;
                }
                return allPages.length + 1;
            },
            initialData: { pages: [initialPosts], pageParams: [1] },
        });

    const { setTarget } = useIntersectionObserver({
        onIntersect: () => {
            if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
    });

    const posts = data?.pages.flatMap((page) => page) ?? initialPosts;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <PostSkeleton />
                <PostSkeleton />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <p className="text-center text-gray-500">Здесь пока нет видео.</p>
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

            {!hasNextPage && posts.length > 0 && !isFetchingNextPage && (
                <p className="text-center text-gray-500 py-4">
                    Вы посмотрели все видео.
                </p>
            )}
        </div>
    );
};
