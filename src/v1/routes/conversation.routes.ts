import express, { RequestHandler } from "express";
import {
  createChat,
  getConversations,
  getprofileByConversationId,
} from "../controllers/conversation.controller";
import { authorizeUser } from "middleware/auth";
const router = express.Router();

router.post("/chats", authorizeUser as RequestHandler, createChat);
router.get("/chats", authorizeUser as RequestHandler, getConversations);
router.get("/:id", getConversations);
router.get("/profile/:id", getprofileByConversationId);
export default router;
