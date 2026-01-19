import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@utils/jwt";
import { getSession } from "@config/redis";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ message: "No token provided" });

    const token = auth.split(" ")[1];
    const decoded = verifyToken(token);

    const session = await getSession(decoded.userId);
    if (!session || session !== token)
      return res.status(401).json({ message: "Session expired" });

    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
