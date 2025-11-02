import express, { RequestHandler } from "express";
import upload from "../../middlewares/multer.middleware";
import {
  loginUser,
  RegisterUser,
  getAllUser,
  updateById,
  getUserList,
  getUserById,
} from "../controllers/user.controller";
import { authorizeUser } from "middleware/auth";

const router = express.Router();

router.post("/register", RegisterUser);
router.post("/login", loginUser);
router.get("/", getAllUser);
router.get("/list", authorizeUser as RequestHandler, getUserList);
router.patch("/:id", upload.single("file"), updateById);
router.get("/:id", getUserById);
export default router;
