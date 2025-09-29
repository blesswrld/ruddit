import { Search } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { SearchResultsDropdown } from "./SearchResultsDropdown";

export const SearchInput = () => {
    const router = useRouter();
    const [inputValue, setInputValue] = useState("");
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const debouncedQuery = useDebounce(inputValue, 300); // Задержка в 300ms
    const containerRef = useRef<HTMLDivElement>(null);

    // Закрытие списка по клику вне компонента
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (inputValue.trim() !== "") {
            setIsDropdownVisible(false); // Закрываем список при переходе
            router.push(`/search?q=${encodeURIComponent(inputValue)}`);
        }
    };

    const closeDropdown = () => {
        setIsDropdownVisible(false);
    };

    return (
        <div className="relative w-full max-w-md" ref={containerRef}>
            <form onSubmit={handleSearch}>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    name="q"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setIsDropdownVisible(true)}
                    className="block w-full rounded-md border border-gray-300 bg-gray-50 py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Поиск сообществ"
                    autoComplete="off"
                />
            </form>

            {isDropdownVisible && debouncedQuery.length > 1 && (
                <SearchResultsDropdown
                    query={debouncedQuery}
                    closeDropdown={closeDropdown}
                />
            )}
        </div>
    );
};
