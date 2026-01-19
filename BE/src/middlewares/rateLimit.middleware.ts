
import { Response, NextFunction } from "express";
import { redis } from "@config/redis";
import { AuthRequest } from "./auth.middleware";

const RATE_LIMIT_WINDOW = 60; // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 messages

export const rateLimitMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) return next(); // Should be authenticated, but safe fallback

        const key = `rate_limit:${userId}`;
        const current = await redis.incr(key);

        if (current === 1) {
            await redis.expire(key, RATE_LIMIT_WINDOW);
        }

        if (current > RATE_LIMIT_MAX_REQUESTS) {
            return res.status(429).json({ message: "Too many requests, please try again later." });
        }

        next();
    } catch (error) {
        console.error("Rate limit error:", error);
        next(); // Fail open if Redis fails
    }
};
