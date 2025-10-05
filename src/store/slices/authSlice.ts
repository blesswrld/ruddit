import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Опишем тип для объекта пользователя
interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string | null;
    bio?: string | null;
    linkTelegram?: string | null;
    linkInstagram?: string | null;
    linkYouTube?: string | null;
    linkTikTok?: string | null;
    linkCustomName?: string | null;
    linkCustomUrl?: string | null;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    modal: "login" | "register" | null;
    status: "idle" | "loading" | "succeeded" | "failed";
}

// Начальное состояние
const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    modal: null, // Изначально никакое окно не открыто
    status: "idle", // Изначальное состояние
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Редьюсеры для управления модальными окнами
        openLoginModal: (state) => {
            state.modal = "login";
        },
        openRegisterModal: (state) => {
            state.modal = "register";
        },
        closeModal: (state) => {
            state.modal = null;
        },

        // Редьюсеры для управления статусом
        authCheckStarted: (state) => {
            state.status = "loading";
        },
        authCheckSucceeded: (state) => {
            state.status = "succeeded";
        },
        authCheckFailed: (state) => {
            state.status = "failed";
        },

        // Редьюсер для обновления профиля
        updateUserProfile: (
            state,
            action: PayloadAction<{
                bio?: string | null;
                avatarUrl?: string | null;
            }>
        ) => {
            if (state.user) {
                state.user.bio = action.payload.bio ?? state.user.bio;
                state.user.avatarUrl =
                    action.payload.avatarUrl ?? state.user.avatarUrl;
            }
        },

        // Редьюсер для установки пользователя
        setUser: (state, action: PayloadAction<User>) => {
            state.isAuthenticated = true;
            state.user = action.payload;
        },

        // Редьюсер для выхода
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.status = "idle"; // Сбрасываем статус при выходе
        },
    },
});

export const {
    openLoginModal,
    openRegisterModal,
    closeModal,
    authCheckStarted,
    authCheckSucceeded,
    authCheckFailed,
    updateUserProfile, // Экспортируем action
    setUser, // Экспортируем action
    logout, // Экспортируем action
} = authSlice.actions;

// Экспортируем редьюсер
export default authSlice.reducer;
