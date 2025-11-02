import express, { Request, Response } from "express";
import upload from "../../middlewares/multer.middleware";
import cloudinary from "../../config/cloudinary.config";
const router = express.Router();

// Routes
router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Server is running successfully",
    status: "OK",
  });
});

router.post("/upload", upload.single("image"), async(req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: "uploads", // Cloudinary folder
  });
  const fileUrl = result.secure_url;
  res.json({ url: fileUrl });
});

export default router;
