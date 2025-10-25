import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = (url: string) => {
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        // Создаем соединение. `reconnection: false` важно, чтобы не спамить сервер
        // при перезагрузках в режиме разработки.
        const newSocket = io(url, { reconnection: false });

        setSocket(newSocket);

        // Закрываем соединение при размонтировании компонента
        return () => {
            newSocket.disconnect();
        };
    }, [url]);

    return socket;
};
