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
};
import createError from "http-errors";
import { Conversation } from "./models/conversation.model";
import mongoose, { Types } from "mongoose";
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
app.use(express.json({ limit: "1024mb" }));
app.use(express.urlencoded({ extended: true, limit: "1024mb" }));
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
  const { userId, conversationId } = socket.handshake.query;
  // Check if conversationId is a valid MongoDB ObjectId
  if (!Types.ObjectId.isValid(conversationId as string)) {
    const errorMsg = `Invalid conversationId: ${conversationId}`;
    socket.emit("error", { message: errorMsg });
    socket.disconnect();
    return;
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: { $in: [userId] },
  });

  if (!conversation) {
    const errorMsg = `Socket ${socket.id} tried to join conversation ${conversationId} but is not a participant`;
    socket.emit("error", { message: errorMsg });
    socket.disconnect();
    return;
  }

  if (conversationId) {
    socket.join(conversationId as string);

    // Mark unseen messages as seen by this user
    onlineUsers.set(userId, socket.id);
    const unseenMessages = await Message.find({
      conversationId,
      seenBy: { $ne: userId },
    }).select("_id");

    let ids: Types.ObjectId[] = [];
    if (unseenMessages.length > 0) {
      ids = unseenMessages.map((m) => m._id);

      await Message.updateMany(
        { _id: { $in: ids } },
        {
          $addToSet: { seenBy: userId },
          $set: { seenAt: new Date() },
        }
      );
    }

    // Notify others in the room that this user is online
    io.to(conversationId as string).emit("user-status", {
      userId,
      status: true,
      messageSeen: {
        conversationId,
        status: true,
        messageIds: ids,
      },
    });

    // Check the status of the other user in the conversation and notify the current user
    const otherUser = conversation.participants.find(
      (p) => p.toString() !== userId
    );
    if (otherUser && onlineUsers.has(otherUser.toString())) {
      socket.emit("user-status", {
        userId: otherUser.toString(),
        status: true,
      });
    }
  }

  socket.on("sendImage", async ({ imageUrl, hashId, conversationId }) => {
    const message = new Message({
      conversationId,
      content: imageUrl,
      type: "image",
      sender: userId,
    });
    await message.save();
    io.to(conversationId).emit("receive-message", {
      imageUrl,
      hashId,
      conversationId,
    });
  });

  socket.on("send-message", async (data: MessageData) => {
    const user = await User.findById(userId);
    const message = new Message({
      conversationId: data.conversationId,
      content: data.content,
      senderId: userId,
      sender: {
        name: user?.name,
        avatar: user?.photo,
        email: user?.email,
      },
    });
    await message.save();

    let otherUserId: string[] = [];
    onlineUsers.forEach((value, key) => {
      if (key !== userId) {
        otherUserId = [key];
      }
    });
    const unseenMessages = await Message.find({
      conversationId: data.conversationId,
      seenBy: { $nin: otherUserId },
    }).select("_id");

    if (unseenMessages.length > 0) {
      const ids = unseenMessages.map((m) => m._id);

      await Message.updateMany(
        { _id: { $in: ids } },
        {
          $addToSet: { seenBy: otherUserId },
          $set: { seenAt: new Date() },
        }
      );

      // Notify room about messages marked as seen by the other user

      // Inform the other user (if connected) that their unread count is now zero
      // socket.to(data.conversationId).emit("unread-count-update", {
      //   unreadCount: 0,
      //   conversationId: data.conversationId,
      //   currentUserId: otherUserId[0],
      // });
    }
    io.to(data.conversationId).emit("last-message", {
      ...data,
      sender: {
        name: user?.name,
        avatar: user?.photo,
        email: user?.email,
      },
      timestamp: new Date(),
    });
    console.log("Emitting message to room:", otherUserId);
    io.to(data.conversationId).emit("receive-message", {
      ...data,
      sender: {
        name: user?.name,
        avatar: user?.photo,
        email: user?.email,
      },
      read: otherUserId.length ? true : false,
      timestamp: new Date(),
    });
  });

  // Listen for typing events
  socket.on("typing-start", (data: MessageData) => {
    socket.to(data.conversationId).emit("typing-start-notification", {
      hashId: data.hashId,
    });
  });

  socket.on("typing-stop", (data: MessageData) => {
    socket.to(data.conversationId).emit("typing-stop-notification", {
      hashId: data.hashId,
    });
  });

  socket.on("disconnect", async () => {
    console.log(`Client disconnected: ${socket.id}`);
    if (userId) {
      onlineUsers.delete(userId);
      const lastActive = new Date();
      await User.findOneAndUpdate({ _id: userId }, { lastActive });
      io.to(conversationId as string).emit("user-status", {
        userId,
        status: false,
        lastActive,
      });
    }
  });
});
// Join a room with conversationId

// Start server with HTTP server instead of Express
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} with Socket.IO support`);
});

export default app; // Export the Express app for use in other modules
