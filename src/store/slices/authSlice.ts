import { createSlice } from "@reduxjs/toolkit";

// Описываем тип для состояния этого среза
interface AuthState {
    isAuthenticated: boolean;
    user: { name: string } | null;
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
    },
});

// Экспортируем actions, чтобы их можно было использовать в компонентах
export const { openLoginModal, openRegisterModal, closeModal } =
    authSlice.actions;

// Экспортируем редьюсер
export default authSlice.reducer;
