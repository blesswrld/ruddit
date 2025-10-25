import { Server as SocketIOServer } from "socket.io";
import { Server as NetServer } from "net";
import { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
    socket: {
        server: NetServer & {
            io: SocketIOServer;
        };
    };
};
