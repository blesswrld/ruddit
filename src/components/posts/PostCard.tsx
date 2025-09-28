import { VoteClient } from "./VoteClient";
import Link from "next/link";

// Создаем и ЭКСПОРТИРУЕМ тип, описывающий пост
export type PostForCard = {
    id: string;
    title: string;
    content: string | null;
    createdAt: string; // Даты после JSON.stringify становятся строками
    author: {
        username: string;
    };
    // Добавляем голоса
    votes: {
        userId: string;
        postId: string;
        type: "UP" | "DOWN";
    }[];

    community: {
        slug: string;
    };
};

type PostCardProps = {
    post: PostForCard;
};

export const PostCard = ({ post }: PostCardProps) => {
    const postDate = new Date(post.createdAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            {/* Вертикальный блок для голосования */}
            <div className="flex flex-col items-center p-2 bg-gray-50">
                <VoteClient initialVotes={post.votes} postId={post.id} />
            </div>

            {/* Основной контент поста */}
            <div className="flex-grow">
                <div className="p-4">
                    <div className="mb-2 text-xs text-gray-500">
                        <span>
                            Опубликовал п/{post.author.username} • {postDate}
                        </span>
                    </div>
                    <Link href={`/s/${post.community.slug}/post/${post.id}`}>
                        <h2 className="mb-2 text-xl font-bold hover:underline">
                            {post.title}
                        </h2>
                    </Link>
                    {post.content && (
                        <p className="text-gray-700">{post.content}</p>
                    )}
                </div>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                    <span className="text-sm font-semibold text-gray-600">
                        Комментарии
                    </span>
                </div>
            </div>
        </div>
    );
};
