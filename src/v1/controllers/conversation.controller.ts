import { NextFunction, Request, Response } from "express";
import { Conversation } from "../../models/conversation.model";
import { PipelineStage, Types } from "mongoose";
import { AuthRequest } from "middleware/auth";

export const createChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { participants, isGroup = false } = req.body;
  const { _id: userId } = req.user;
  const existing = await Conversation.findOne({
    participants: { $all: [...participants, userId] },
  });
  if (existing) {
    throw new Error("Conversation already exists");
  }
  const users = [...participants, userId];
  const conversation = new Conversation({
    participants: users,
    isGroup: isGroup,
  });
  await conversation.save();

  const chat = {
    _id: conversation._id,
    type: isGroup ? "group" : "direct",
    participants: users,
  };
  res.json({
    message: "Conversation created successfully",
    data: chat,
  });
};

export const getConversations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  const { _id: userId } = req.user;
  let pipeline: PipelineStage[] = [];
  pipeline.push(
    {
      $match: {
        participants: { $in: [new Types.ObjectId(userId)] },
      },
    },
    {
      $addFields: {
        type: {
          $cond: {
            if: { $eq: ["$isGroup", true] },
            then: "group",
            else: "direct",
          },
        },
      },
    },
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "conversationId",
        as: "lastMessage",
      },
    },
    {
      $addFields: {
        lastMessage: { $arrayElemAt: ["$lastMessage", -1] },
      },
    },
    {
      $addFields: {
        "lastMessage.timestamp": {
          $ifNull: [
            "$lastMessage.createdAt",
            { $ifNull: ["$lastMessage.updatedAt", null] },
          ],
        },
      },
    },
    {
      $project: {
        isGroup: 0,
      },
    }
  );
  const conversations = await Conversation.aggregate(pipeline).exec();
  res.json({
    data: conversations,
  });
};

export const getprofileByConversationId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const { id: conversationId } = req.params;

  try {
    let pipeline: PipelineStage[] = [
      {
        $match: {
          _id: new Types.ObjectId(conversationId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "participants",
        },
      },
      {
        $project: {
          participants: {
            _id: 1,
            name: 1,
            photo: 1,
            lastActive: 1,
          },
        },
      },
    ];
    const result = await Conversation.aggregate(pipeline).exec();

    if (!result || result.length === 0) {
      res.status(404).json({ message: "Conversation not found" });
    } else {
      res.json({
        data: result[0].participants,
      });
    }
  } catch (error) {
    console.log("Error fetching conversation profile:", error);
    next(error);
  }
};
