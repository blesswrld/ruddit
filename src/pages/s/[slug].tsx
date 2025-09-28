import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getServerSideProps = (async (context) => {
    const { slug } = context.params!;

    const community = await prisma.community.findUnique({
        where: { slug: slug as string },
        include: {
            creator: {
                select: { username: true },
            },
        },
    });

    if (!community) {
        return { notFound: true };
    }

    return {
        props: {
            community: JSON.parse(JSON.stringify(community)),
        },
    };
}) satisfies GetServerSideProps;

export default function CommunityPage({
    community,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    return (
        <div>
            {/* Шапка сообщества */}
            <div className="bg-white">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold">{community.name}</h1>
                    <p className="text-gray-500">s/{community.slug}</p>
                </div>
            </div>

            {/* Основной контент */}
            <div className="container mx-auto mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Лента постов (пока пустая) */}
                <div className="md:col-span-2">
                    <div className="rounded-md bg-white p-4 shadow">
                        Здесь будут посты...
                    </div>
                </div>

                {/* Сайдбар с информацией */}
                <div className="md:col-span-1">
                    <div className="rounded-md bg-white p-4 shadow">
                        <h2 className="mb-2 border-b pb-2 font-bold">
                            О сообществе
                        </h2>
                        <p className="text-sm text-gray-700">
                            {community.description || "Нет описания."}
                        </p>
                        <div className="mt-4 text-sm text-gray-500">
                            <p>
                                Создано:{" "}
                                {new Date(
                                    community.createdAt
                                ).toLocaleDateString("ru-RU")}
                            </p>
                            <p>Создатель: u/{community.creator.username}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
