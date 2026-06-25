import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  body: any;
  params: any;
  headers: any;
  query: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): any => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized - no token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction): any => {
  if (req.userRole !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Admin access only" });
  }
  next();
};