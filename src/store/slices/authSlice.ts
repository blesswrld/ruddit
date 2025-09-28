import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Опишем тип для объекта пользователя
interface User {
    id: string;
    username: string;
    email: string;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    modal: "login" | "register" | null;
}

// Начальное состояние
const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    modal: null, // Изначально никакое окно не открыто
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
        // Редьюсер для установки пользователя
        setUser: (state, action: PayloadAction<User>) => {
            state.isAuthenticated = true;
            state.user = action.payload;
        },
        // Редьюсер для выхода
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
        },
    },
});

export const {
    openLoginModal,
    openRegisterModal,
    closeModal,
    setUser, // Экспортируем новый action
    logout, // Экспортируем новый action
} = authSlice.actions;

// Экспортируем редьюсер
export default authSlice.reducer;
