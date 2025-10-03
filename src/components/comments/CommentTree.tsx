import { Comment } from "./Comment";
import type { PostInfo } from "./Comment";

// Тип для комментариев, приходящих с сервера (плоский список)
type RawComment = {
    id: string;
    text: string;
    createdAt: string;
    author: { username: string; id: string };
    replyToId: string | null;
};

// Тип для узла дерева, который мы будем рендерить
// Экспортируем этот тип
export type CommentNode = RawComment & {
    replies: CommentNode[];
};

type CommentTreeProps = {
    comments: RawComment[];
    postInfo: PostInfo;
};

export const CommentTree = ({ comments, postInfo }: CommentTreeProps) => {
    // Функция для рекурсивного построения дерева
    const buildTree = (parentId: string | null): CommentNode[] => {
        return comments
            .filter((comment) => comment.replyToId === parentId)
            .sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
            )
            .map((comment) => ({
                ...comment,
                replies: buildTree(comment.id),
            }));
    };

    const commentTree = buildTree(null);

    // Поработать над вложенностью
    return (
        <div className="flex flex-col gap-4">
            {commentTree.map((comment) => (
                <Comment
                    key={comment.id}
                    comment={comment}
                    postInfo={postInfo}
                />
            ))}
        </div>
    );
};
