import { RequestHandler, Router } from "express";
import { getAllMessages } from "../controllers/message.controller";
import { authorizeUser } from "middleware/auth";

const router = Router();

router.get("/:conversationId", authorizeUser as RequestHandler, getAllMessages);

export default router;
  