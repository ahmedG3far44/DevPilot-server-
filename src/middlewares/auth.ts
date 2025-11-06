import { AuthRequest } from "../types";
import { Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token =
      req.cookies?.auth_token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecret") as any;

    req.user = {
      id: decoded.id,
      name:decoded.name,
      email: decoded.email,
      login: decoded.login,
      avatar_url:decoded.avatar
    };

    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
