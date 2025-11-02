import { Schema, Types, model } from "mongoose";

// 1. Create an interface representing a document in MongoDB.
export interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  sender: {
    name: string;
    avatar: String;
    email: String;
  };
  content: string;
  type: "text" | "image" | "video" | "audio" | "file";
  seenBy: Types.ObjectId[];
  createdAt: Date;
  updateAt: Date;
}

// 2. Create a Schema corresponding to the document interface.
const MessageSchema = new Schema<IMessage>(
  {
    conversationId: Types.ObjectId,
    senderId: Types.ObjectId,
    content: String,
    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "file"],
      default: "text",
    },
    sender: {
      name: String,
      avatar: String,
      email: String,
    },
    seenBy: [Types.ObjectId],
    // And `Schema.Types.ObjectId` in the schema definition.
  },
  { timestamps: true }
);

export const Message = model<IMessage>("message", MessageSchema);
