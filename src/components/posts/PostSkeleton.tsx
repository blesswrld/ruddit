export const PostSkeleton = () => {
    return (
        <div className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
            <div className="animate-pulse">
                <div className="mb-3 h-2 w-1/3 rounded bg-gray-200"></div>
                <div className="mb-2 h-4 w-2/3 rounded bg-gray-300"></div>
                <div className="h-3 w-full rounded bg-gray-200"></div>
                <div className="mt-1 h-3 w-5/6 rounded bg-gray-200"></div>
            </div>
        </div>
    );
};
