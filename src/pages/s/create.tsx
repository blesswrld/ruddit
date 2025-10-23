import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useRouter } from "next/router";
import { useState } from "react";

const NAME_MAX_LENGTH = 30;
const DESC_MAX_LENGTH = 200;

export default function CreateCommunityPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/communities/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
                credentials: "include",
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message);
            }

            // Перенаправляем на страницу нового сообщества
            router.push(`/s/${data.slug}`);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-2xl rounded-md bg-white p-6 shadow">
            <h1 className="mb-4 text-2xl font-bold">Создать сообщество</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                    id="community-name"
                    label="Название сообщества"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    required
                    minLength={3}
                    maxLength={NAME_MAX_LENGTH}
                />
                <div>
                    <label
                        htmlFor="community-desc"
                        className="mb-1 block text-sm font-medium text-gray-700"
                    >
                        Описание (необязательно)
                    </label>
                    <textarea
                        id="community-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isLoading}
                        rows={4}
                        maxLength={DESC_MAX_LENGTH}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-0"
                    />
                    <p
                        className={`mt-1 text-right text-xs ${
                            description.length >= 200
                                ? "text-red-500"
                                : "text-gray-500"
                        }`}
                    >
                        {description.length} / 200
                    </p>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                    type="submit"
                    disabled={
                        isLoading ||
                        name.trim().length < 3 ||
                        name.length > 30 ||
                        description.length > 200
                    }
                >
                    {isLoading ? "Создание..." : "Создать сообщество"}
                </Button>
            </form>
        </div>
    );
}
