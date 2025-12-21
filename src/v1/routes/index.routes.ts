import express, { Request, Response } from "express";
import upload from "../../middlewares/multer.middleware";
import cloudinary from "../../config/cloudinary.config";
import { Readable } from "stream";
const router = express.Router();

// Routes
router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Server is running successfully",
    status: "OK",
  });
});

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "uploads",
        resource_type: "auto", // Automatically detect image/video/raw
      },
      (error:any, result:any) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({ error: "Upload failed" });
        }
        res.json({
          url: result?.secure_url,
          public_id: result?.public_id,
          format: result?.format,
          resource_type: result?.resource_type,
        });
      }
    );

    Readable.from(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
