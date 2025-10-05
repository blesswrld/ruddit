import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            keyframes: {
                highlight: {
                    "0%": { backgroundColor: "rgba(59, 130, 246, 0.4)" },
                    "100%": { backgroundColor: "transparent" },
                },
                "highlight-parent": {
                    "0%": { backgroundColor: "rgba(59, 130, 246, 0.2)" },
                    "100%": { backgroundColor: "transparent" },
                },
            },
            animation: {
                highlight: "highlight 3s ease-out",
                "highlight-parent": "highlight-parent 3s ease-out",
            },
        },
    },
    plugins: [],
};
export default config;
