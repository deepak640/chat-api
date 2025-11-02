import { NextFunction, Request, Response } from "express";
import { Message } from "../../models/message.model";
import mongoose from "mongoose";

export const getAllMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.aggregate([
      {
        $match: {
          conversationId: new mongoose.Types.ObjectId(conversationId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "senderId",
          foreignField: "_id",
          as: "senderInfo",
        },
      },
      {
        $unwind: "$senderInfo",
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
      {
        $project: {
          _id: 1,
          sender: {
            name: "$senderInfo.name",
            email: "$senderInfo.email",
            avatar: "$senderInfo.photo",
          },
          content: "$content",
          senderId: 1,
          conversationId: 1,
          timestamp: "$createdAt",
        },
      },
    ]);

    res.status(200).json({
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};
