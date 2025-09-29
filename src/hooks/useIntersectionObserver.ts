import { useEffect, useState } from "react";

type UseIntersectionObserverOptions = {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
    onIntersect: () => void;
};

export const useIntersectionObserver = ({
    root = null,
    rootMargin = "0px",
    threshold = 1.0,
    onIntersect,
}: UseIntersectionObserverOptions) => {
    const [target, setTarget] = useState<Element | null>(null);

    useEffect(() => {
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onIntersect();
                }
            },
            { root, rootMargin, threshold }
        );

        observer.observe(target);

        return () => {
            observer.unobserve(target);
        };
    }, [target, root, rootMargin, threshold, onIntersect]);

    return { setTarget };
};
