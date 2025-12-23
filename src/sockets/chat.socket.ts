import { Server, Socket } from "socket.io";
import { Types } from "mongoose";
import { Conversation } from "../models/conversation.model";
import { Message } from "../models/message.model";
import { User } from "../models/user.model";

// keep this EXACTLY as before
const onlineUsers = new Map<string, Set<string>>();

const registerChatSockets = async (io: Server, socket: Socket) => {
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
  socket.join(`user_${userId}`); // Join personal room

  socket.emit("online-users", {
    users: Array.from(onlineUsers.keys()),
  });

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

      sockets?.forEach((socketId) => {
        io.to(socketId).emit("unread-count-update", {
          conversationId,
          unreadCount: 0,
        });
      });

      io.to(conversationId).emit("message-seen", {
        conversationId,
        userId,
        messageIds: ids,
      });
    }

    socket.to(conversationId).emit("user-in-chat", {
      userId,
      conversationId,
    });
  });

  /* ===========================
     3️⃣ SEND MESSAGE
     =========================== */

  socket.on("send-message", async (data) => {
    const user = await User.findById(userId);

    const message = new Message({
      conversationId: data.conversationId,
      content: data.content,
      senderId: userId,
      type: data.type || "text",
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      seenBy: [userId],
      sender: {
        name: user?.name,
        avatar: user?.photo,
        email: user?.email,
      },
    });

    await message.save();

    await Conversation.findByIdAndUpdate(data.conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    io.to(data.conversationId).emit("receive-message", {
      ...message.toObject(),
      read: false,
      timestamp: new Date(),
    });

    const conversation = await Conversation.findById(
      data.conversationId
    ).select("participants");

    conversation?.participants.forEach((participantId) => {
      const sockets = onlineUsers.get(participantId.toString());

      sockets?.forEach((socketId) => {
        io.to(socketId).emit("last-message", {
          conversationId: data.conversationId,
          lastMessage: {
            ...message.toObject(),
            timestamp: message.createdAt,
          },
        });
      });
    });

    conversation?.participants.forEach((participantId) => {
      if (participantId.toString() === userId) return;

      const sockets = onlineUsers.get(participantId.toString());

      sockets?.forEach((socketId) => {
        io.to(socketId).emit("unread-count-update", {
          conversationId: data.conversationId,
          delta: +1,
        });
      });
    });
  });

  /* ===========================
     4️⃣ TYPING INDICATORS
     =========================== */

  socket.on("typing-start", ({ conversationId }) => {
    socket.to(conversationId).emit("typing-start", { userId });
  });

  socket.on("typing-stop", ({ conversationId }) => {
    socket.to(conversationId).emit("typing-stop", { userId });
  });

  /* ===========================
     5️⃣ DISCONNECT
     =========================== */

  socket.on("disconnect", async () => {
    const userSockets = onlineUsers.get(userId);

    if (!userSockets) return;

    userSockets.delete(socket.id);

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
  });
};

export default registerChatSockets;
