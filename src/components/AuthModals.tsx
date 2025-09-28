import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { closeModal } from "@/store/slices/authSlice";
import { LoginForm } from "./auth/LoginForm"; // 1. Импортируем LoginForm
import { RegisterForm } from "./auth/RegisterForm"; // 2. Импортируем RegisterForm
import { Modal } from "./common/Modal";

export const AuthModals = () => {
    const dispatch = useAppDispatch();
    const { modal } = useAppSelector((state) => state.auth);

    const handleClose = () => {
        dispatch(closeModal());
    };

    return (
        <>
            <Modal
                isOpen={modal === "login"}
                onClose={handleClose}
                title="Вход в Ruddit"
            >
                <LoginForm /> {/* 3. Используем компонент */}
            </Modal>

            <Modal
                isOpen={modal === "register"}
                onClose={handleClose}
                title="Регистрация на Ruddit"
            >
                <RegisterForm /> {/* 4. Используем компонент */}
            </Modal>
        </>
    );
};
