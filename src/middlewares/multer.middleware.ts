import multer, { StorageEngine } from "multer";
import path from "path";
import { Request } from "express";

// Storage config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
export default upload;
