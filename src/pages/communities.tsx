import { PrismaClient } from "@prisma/client";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";
import { verify } from "jsonwebtoken";

const prisma = new PrismaClient();

// Определяем тип для одного элемента в списке
type CommunityInList = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    _count: {
        subscribers: number;
    };
};

// Тип для пропсов, `show`
type CommunitiesPageProps = {
    communities: CommunityInList[];
    show: string;
};

interface JwtPayload {
    userId: string;
}

export const getServerSideProps: GetServerSideProps<
    CommunitiesPageProps
> = async (context) => {
    // Обрабатываем случай, когда query.show - это массив
    const queryShow = context.query.show;
    const show = Array.isArray(queryShow) ? queryShow[0] : queryShow || "all";

    let communities: CommunityInList[] = []; // Явно задаем тип

    if (show === "subscribed") {
        const { token } = context.req.cookies;
        if (token) {
            try {
                const { userId } = verify(
                    token,
                    process.env.JWT_SECRET!
                ) as JwtPayload;
                const subscriptions = await prisma.subscription.findMany({
                    where: { userId },
                    include: {
                        community: {
                            include: {
                                _count: { select: { subscribers: true } },
                            },
                        },
                    },
                    orderBy: { community: { name: "asc" } },
                });
                communities = subscriptions.map((sub) => sub.community);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                // Ошибка токена, оставляем communities пустым
            }
        }
    } else {
        communities = await prisma.community.findMany({
            orderBy: { subscribers: { _count: "desc" } },
            include: { _count: { select: { subscribers: true } } },
        });
    }

    return {
        props: {
            communities: JSON.parse(JSON.stringify(communities)),
            show,
        },
    };
};

export default function CommunitiesPage({
    communities,
    show,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    return (
        <div className="container mx-auto max-w-4xl py-6">
            {/* Навигация */}
            <div className="mb-4 border-b">
                <nav className="-mb-px flex space-x-8">
                    <Link
                        href="/communities"
                        className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                            show === "all"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                        }`}
                    >
                        Все сообщества
                    </Link>
                    {isAuthenticated && (
                        <Link
                            href="/communities?show=subscribed"
                            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                                show === "subscribed"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                            }`}
                        >
                            Мои подписки
                        </Link>
                    )}
                </nav>
            </div>

            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-3xl font-bold">
                    {show === "subscribed" ? "Мои подписки" : "Все сообщества"}
                </h1>
                <Link
                    href="/s/create"
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 border-none outline-none ring-0 focus:ring-0"
                >
                    Создать свое
                </Link>
            </div>

            {communities.length > 0 ? (
                <div className="flex flex-col gap-4">
                    {/* Явно указываем типы в map */}
                    {communities.map(
                        (community: CommunityInList, index: number) => (
                            <Link
                                key={community.id}
                                href={`/s/${community.slug}`}
                                className="block rounded-lg border bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-gray-500">
                                        {index + 1}
                                    </span>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">
                                            с/{community.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-gray-600 break-all">
                                            {community.description ||
                                                "Нет описания"}
                                        </p>
                                        <p className="mt-2 text-xs text-gray-500">
                                            {community._count.subscribers}{" "}
                                            подписчиков
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        )
                    )}
                </div>
            ) : (
                <div className="text-center text-gray-500">
                    {show === "subscribed" ? (
                        <p>Вы пока ни на что не подписаны.</p>
                    ) : (
                        <p>Пока не создано ни одного сообщества.</p>
                    )}
                </div>
            )}
        </div>
    );
}
