import { Server, Socket } from "socket.io";

const registerWebRTCSockets = (io: Server, socket: Socket) => {
  socket.on("call-user", ({ toUserId, offer }) => {
    socket.to(toUserId).emit("incoming-call", {
      fromUserId: socket.id,
      offer,
    });
  });

  socket.on("accept-call", ({ toUserId, answer }) => {
    socket.to(toUserId).emit("call-accepted", {
      answer,
    });
  });

  socket.on("ice-candidate", ({ toUserId, candidate }) => {
    socket.to(toUserId).emit("ice-candidate", {
      candidate,
    });
  });

  socket.on("end-call", ({ toUserId }) => {
    socket.to(toUserId).emit("call-ended");
  });
};

export default registerWebRTCSockets;
