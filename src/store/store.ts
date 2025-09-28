import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice"; // 1. Импортируем редьюсер

export const store = configureStore({
    reducer: {
        auth: authReducer, // 2. Добавляем его в список редьюсеров
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
