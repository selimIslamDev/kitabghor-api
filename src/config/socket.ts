import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    socket.on("join-admin", () => {
      socket.join("admin-room");
      console.log(`👨‍💼 Admin joined: ${socket.id}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};