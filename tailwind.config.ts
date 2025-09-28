import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Здесь мы в будущем сможем добавлять свои цвета, шрифты и т.д.
        },
    },
    plugins: [],
};
export default config;
