import { Server, Socket } from "socket.io";
import { User } from "../models/user.model";

const registerWebRTCSockets = (io: Server, socket: Socket) => {
  const { userId } = socket.handshake.query as { userId: string };

  socket.on("call-user", async ({ toUserId, offer }) => {
    const fromUser = await User.findById(userId).select("name photo email");
    socket.to(`user_${toUserId}`).emit("incoming-call", {
      fromUser,
      offer,
    });
  });

  socket.on("accept-call", ({ toUserId, answer }) => {
    socket.to(`user_${toUserId}`).emit("call-accepted", {
      answer,
    });
  });

  socket.on("ice-candidate", ({ toUserId, candidate }) => {
    socket.to(`user_${toUserId}`).emit("ice-candidate", {
      candidate,
    });
  });

  socket.on("end-call", ({ toUserId }) => {
    socket.to(`user_${toUserId}`).emit("call-ended");
  });
};

export default registerWebRTCSockets;
