import express from "express";
const router = express.Router();

import userRouter from "../v1/routes/user.routes";
import conversationRouter from "../v1/routes/conversation.routes";
import messageRouter from "../v1/routes/message.routes";
import indexRouter from "../v1/routes/index.routes";

router.use("/",indexRouter)
router.use("/users", userRouter);
router.use("/conversations", conversationRouter);
router.use("/messages", messageRouter);
export default router;
