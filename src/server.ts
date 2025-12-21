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

// Socket.IO event handlers
io.on("connection", async (socket: Socket) => {
  const { userId } = socket.handshake.query as { userId: string };
  if (!userId || !Types.ObjectId.isValid(userId)) {
    socket.disconnect();
    return;
  }

  /* ===========================
     1️⃣ GLOBAL ONLINE PRESENCE
     =========================== */

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socket.id);

  // send current online users to the connected client
   socket.emit("online-users", {
     users: Array.from(onlineUsers.keys()),
   });

  // notify globally (optional)
  io.emit("global-user-status", {
    userId,
    status: true,
  });

  /* ===========================
     2️⃣ JOIN CONVERSATION
     =========================== */

  socket.on("join_chat", async ({ conversationId }) => {
    if (!Types.ObjectId.isValid(conversationId)) return;
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: { $in: [userId] },
    });

    if (!conversation) return;

    socket.join(conversationId);

    /* ---- Mark messages as READ ---- */
    const unseenMessages = await Message.find({
      conversationId,
      senderId: { $ne: userId },
      seenBy: { $ne: userId },
    }).select("_id");

    if (unseenMessages.length > 0) {
      const ids = unseenMessages.map((m) => m._id);

      await Message.updateMany(
        { _id: { $in: ids } },
        {
          $addToSet: { seenBy: userId },
          $set: { seenAt: new Date() },
        }
      );

      const sockets = onlineUsers.get(userId);

      if (sockets) {
        sockets.forEach((socketId: string) => {
          io.to(socketId).emit("unread-count-update", {
            conversationId,
            unreadCount: 0,
          });
        });
      }

      io.to(conversationId).emit("message-seen", {
        conversationId,
        userId,
        messageIds: ids,
      });
    }

    /* ---- Conversation-level presence ---- */
    socket.to(conversationId).emit("user-in-chat", {
      userId,
      conversationId,
    });
  });


  // Send message
  socket.on("send-message", async (data: MessageData) => {
    const user = await User.findById(userId);
    const message = new Message({
      conversationId: data.conversationId,
      content: data.content,
      senderId: userId,
      type: data.type || "text",
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      seenBy: [userId], // sender has seen it
      sender: {
        name: user?.name,
        avatar: user?.photo,
        email: user?.email,
      },
    });

    await message.save();

    // update conversation metadata
    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    /* ---- Deliver message ---- */
    io.to(data.conversationId).emit("receive-message", {
      ...message.toObject(),
      read: false,
      sender: {
        name: user?.name,
        avatar: user?.photo,
        email: user?.email,
      },
      timestamp: new Date(),
    });

    const conversation = await Conversation.findById(
      data.conversationId
    ).select("participants");

    /* ---- Sidebar instant update ---- */
    conversation?.participants.forEach((participantId) => {
      const sockets = onlineUsers.get(participantId.toString());

      if (sockets) {
        sockets.forEach((socketId: string) => {
          io.to(socketId).emit("last-message", {
            conversationId: data.conversationId,
            lastMessage: {
              ...message.toObject(),
              timestamp: message.createdAt,
            },
          });
        });
      }
    });

    /* ---- Unread count update ---- */
    conversation?.participants.forEach((participantId) => {
      if (participantId.toString() === userId) return; // skip sender

      const sockets = onlineUsers.get(participantId.toString());

      if (sockets) {
        sockets.forEach((socketId: string) => {
          io.to(socketId).emit("unread-count-update", {
            conversationId: data.conversationId,
            delta: +1,
          });
        });
      }
    });
  });

  /* ===========================
     5️⃣ TYPING INDICATORS
     =========================== */

  socket.on("typing-start", ({ conversationId }) => {
    socket.to(conversationId).emit("typing-start", { userId });
  });

  socket.on("typing-stop", ({ conversationId }) => {
    socket.to(conversationId).emit("typing-stop", { userId });
  });

  /* ===========================
     6️⃣ DISCONNECT
     =========================== */

  socket.on("disconnect", async () => {
    const userSockets = onlineUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socket.id);

      // user completely offline
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, {
          lastActive: new Date(),
        });

        io.emit("global-user-status", {
          userId,
          status: false,
          lastActive: new Date(),
        });
      }
    }
  });
});

// Join a room with conversationId

// Start server with HTTP server instead of Express
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.IO support`);
});

export default app; // Export the Express app for use in other modules
