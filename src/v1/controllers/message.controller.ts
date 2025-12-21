import { NextFunction, Request, Response } from 'express'
import { Message } from '../../models/message.model'
import mongoose from 'mongoose'
import { AuthRequest } from '../../middleware/auth'

export const getAllMessages = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { conversationId } = req.params
    const { _id: userId } = req.user
    const messages = await Message.aggregate([
      {
        $match: {
          conversationId: new mongoose.Types.ObjectId(conversationId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'senderInfo',
        },
      },
      {
        $unwind: '$senderInfo',
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
      {
        $addFields: {
          read: {
            $in: [new mongoose.Types.ObjectId(userId), '$seenBy'],
          },
        },
      },
      {
        $project: {
          _id: 1,
          sender: {
            name: '$senderInfo.name',
            email: '$senderInfo.email',
            avatar: '$senderInfo.photo',
          },
          read: 1,
          content: '$content',
          senderId: 1,
          conversationId: 1,
          timestamp: '$createdAt',
          type: 1,
          fileUrl: 1,
          fileName: 1,
          fileSize: 1,
        },
      },
    ])

    res.status(200).json({
      message: 'Messages fetched successfully',
      data: messages,
    })
  } catch (error) {
    console.log('🚀 ----------------------------------🚀')
    console.log('🚀 ~ getAllMessages ~ error:', error)
    console.log('🚀 ----------------------------------🚀')
    next(error)
  }
}
