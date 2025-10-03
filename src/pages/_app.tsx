import { Layout } from "@/components/Layout";
import { useAppDispatch } from "@/store/hooks";
// Импортируем все необходимые экшены
import {
    authCheckStarted,
    authCheckSucceeded,
    authCheckFailed,
    setUser,
} from "@/store/slices/authSlice";
import { store } from "@/store/store";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";

// Создаем "умный" компонент, который будет содержать логику
function AppContent({ Component, pageProps }: AppProps) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const checkUser = async () => {
            dispatch(authCheckStarted()); // Сообщаем, что проверка началась
            try {
                const response = await fetch("/api/auth/me");
                if (response.ok) {
                    const user = await response.json();
                    dispatch(setUser(user));
                }
                dispatch(authCheckSucceeded()); // Сообщаем, что проверка успешно завершилась
            } catch (error) {
                console.error("Failed to fetch user", error);
                dispatch(authCheckFailed()); // Сообщаем, что проверка провалилась
            }
        };
        checkUser();
    }, [dispatch]); // Зависимость от dispatch, чтобы ESLint не ругался

    return (
        <Layout>
            <Component {...pageProps} />
        </Layout>
    );
}

// Главный компонент App остается простым провайдером
export default function App(props: AppProps) {
    // Создаем клиент. Важно, чтобы он не пересоздавался при каждом рендере.
    const [queryClient] = useState(() => new QueryClient());

    return (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                {/* Оборачиваем */}
                <Toaster position="bottom-right" /> <AppContent {...props} />
            </QueryClientProvider>
        </Provider>
    );
}
