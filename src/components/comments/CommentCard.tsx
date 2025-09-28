import Link from "next/link";

export type CommentForCard = {
    id: string;
    text: string;
    createdAt: string;
    post: {
        id: string;
        title: string;
        community: {
            slug: string;
        };
    };
};

type CommentCardProps = {
    comment: CommentForCard;
};

export const CommentCard = ({ comment }: CommentCardProps) => {
    const commentDate = new Date(comment.createdAt).toLocaleDateString(
        "ru-RU",
        {
            day: "numeric",
            month: "long",
            year: "numeric",
        }
    );

    return (
        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-gray-700">{comment.text}</p>
            <div className="text-xs text-gray-500">
                Комментарий к посту{" "}
                <Link
                    href={`/s/${comment.post.community.slug}/post/${comment.post.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                >
                    {comment.post.title}
                </Link>
                {" • "}
                {commentDate}
            </div>
        </div>
    );
};
