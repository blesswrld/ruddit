import { Layout } from "@/components/Layout";
import { store } from "@/store/store"; // 1. Импортируем наш store
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Provider } from "react-redux"; // 2. Импортируем Provider

export default function App({ Component, pageProps }: AppProps) {
    return (
        <Provider store={store}>
            {/* 3. Оборачиваем всё в Provider */}
            <Layout>
                <Component {...pageProps} />
            </Layout>
        </Provider>
    );
}
