import { Layout } from "@/components/Layout";
import { useAppDispatch } from "@/store/hooks"; // 1. Импортируем хук
import { setUser } from "@/store/slices/authSlice"; // 2. Импортируем setUser
import { store } from "@/store/store";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react"; // 3. Импортируем useEffect
import { Provider } from "react-redux";

// Создаем "умный" компонент, который будет содержать логику
function AppContent({ Component, pageProps }: AppProps) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const response = await fetch("/api/auth/me");
                if (response.ok) {
                    const user = await response.json();
                    dispatch(setUser(user));
                }
            } catch (error) {
                console.error("Failed to fetch user", error);
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
    return (
        <Provider store={store}>
            <AppContent {...props} />
        </Provider>
    );
}
