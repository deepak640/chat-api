import type { Request, Response, NextFunction, Application } from "express";
import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import v1Router from "./v1/v1.routes";
import connectDB from "./db/connection";
import cors from "cors";
import logger from "morgan";
import { errorHandler } from "./middlewares/errorHandler.middleware";
// Define an interface for Error objects with optional status code
interface AppError extends Error {
  statusCode?: number;
}
type MessageData = {
  conversationId: string;
  content: string;
  hashId: string;
  type?: "text" | "image" | "video" | "audio" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
};
import createError from "http-errors";
import { Conversation } from "./models/conversation.model";
import { Types } from "mongoose";
import { User } from "./models/user.model";
import { Message } from "./models/message.model";
import path from "path";
import registerSocketHandlers from "sockets";

connectDB();

// Initialize express app
const app: Application = express();
app.use(cors());

app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const PORT: number = parseInt(process.env.PORT || "4000", 10);

// Track connected users
interface User {
  id: string;
  username: string;
}

// Middlewares
app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(logger("dev"));
app.use(((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    return res.status(200).json({});
  }

  next();
}) as (req: Request, res: Response, next: NextFunction) => void);

app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/v1", v1Router);

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Server is running successfully",
    status: "OK",
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
    status: "ERROR",
  });
});

// Error handling middleware
app.use((error: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    status: "ERROR",
    message: error.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
});
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(errorHandler);

const onlineUsers = new Map();

registerSocketHandlers(io);

// Join a room with conversationId

// Start server with HTTP server instead of Express
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.IO support`);
});

export default app; // Export the Express app for use in other modules
