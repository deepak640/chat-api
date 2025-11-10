import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/user.model"; // adjust path to your model

// 1️⃣ Extend Express Request type to include `user`
export interface AuthRequest extends Request {
  user?: any; // You can replace `any` with your User type/interface if defined
}

// 2️⃣ Middleware function
export const authorizeUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Authorization token missing or invalid" });
    } 

    const token = authHeader.split(" ")[1];

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    if (!decoded || !decoded._id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Find user in DB
    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error("Authorization Error:", error.message);
    res
      .status(401)
      .json({ message: "Unauthorized access", error: error.message });
  }
};
