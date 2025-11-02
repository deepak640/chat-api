import { Schema, Types, model } from "mongoose";

// 1. Create an interface representing a document in MongoDB.
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  password: string;
  photo: string;
  bio: string;
  dob: Date;
  lastActive: Date;
  hashId: string;
  createdAt: Date;
  updateAt: Date;
}

// 2. Create a Schema corresponding to the document interface.
const UserSchema = new Schema<IUser>(
  {
    name: String,
    email: String,
    dob: Date,
    bio: String,
    password: String,
    lastActive: Date,
    photo: String,
    hashId: String,
    phone: String,
    // And `Schema.Types.ObjectId` in the schema definition.
  },
  { timestamps: true }
);

export const User = model<IUser>("User", UserSchema);
