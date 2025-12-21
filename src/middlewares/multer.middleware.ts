import multer, { StorageEngine } from "multer";
import path from "path";
import { Request } from "express";

// Storage config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});
export default upload;
