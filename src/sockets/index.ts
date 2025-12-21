import { Server } from "socket.io";
import registerChatSockets from "./chat.socket";
import registerWebRTCSockets from "./webrtc.socket";

const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket) => {
    registerChatSockets(io, socket);
    registerWebRTCSockets(io, socket);
  });
};

export default registerSocketHandlers;
