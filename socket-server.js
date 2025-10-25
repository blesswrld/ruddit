const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // Чтобы парсить JSON body

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", // Разрешаем доступ нашему сайту
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log("✅ WebSocket: Client connected", socket.id);
    socket.on("join_conversation", (conversationId) => {
        console.log(`User ${socket.id} joining room ${conversationId}`);
        socket.join(conversationId);
    });
    socket.on("disconnect", () => {
        console.log("🔥 WebSocket: Client disconnected", socket.id);
    });
});

// Создаем специальный эндпоинт для нашего Next.js API
app.post("/emit", (req, res) => {
    const { conversationId, message } = req.body;
    if (conversationId && message) {
        console.log(`Emitting message to room ${conversationId}`);
        io.to(conversationId).emit("new_message", message);
        res.status(200).send("OK");
    } else {
        res.status(400).send("Bad Request");
    }
});

server.listen(3001, () => {
    console.log("🚀 WebSocket server listening on port 3001");
});
