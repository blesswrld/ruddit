import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

// Описываем тип для состояния этого среза
interface AuthState {
    isAuthenticated: boolean;
    user: { name: string } | null;
}

// Начальное состояние
const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        // Здесь будут наши "действия" (actions)
        // Например, setUser, logout и т.д.
        // Пока оставим это поле пустым
    },
});

// Экспортируем редьюсер
export default authSlice.reducer;
