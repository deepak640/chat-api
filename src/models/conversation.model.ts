import { Schema, Types, model } from "mongoose";

// 1. Create an interface representing a document in MongoDB.
export interface IConversation {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  isGroup: boolean;
  lastMessage: Types.ObjectId;
  createdAt: Date;
  updateAt: Date;
}

// 2. Create a Schema corresponding to the document interface.
const ConversationSchema = new Schema<IConversation>(
  {
    participants: [Types.ObjectId],
    isGroup: {
      default: false,
      type: Boolean,
    },
    lastMessage: Types.ObjectId,
  },
  { timestamps: true }
);

export const Conversation = model<IConversation>(
  "conversation",
  ConversationSchema
);
