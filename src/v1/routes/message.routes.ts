import { Router } from "express";
import { getAllMessages } from "../controllers/message.controller";

const router = Router();

router.get("/:conversationId", getAllMessages);

export default router;
