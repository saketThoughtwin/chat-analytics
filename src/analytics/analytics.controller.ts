import { Response } from "express";
import { AuthRequest } from "@middlewares/auth.middleware";
import analyticsService from "./analytics.service";

export default class AnalyticsController {
    static async dashboard(req: AuthRequest, res: Response) {
        const data = {
            totalUsers: await analyticsService.totalUsers(),
            onlineUsers: await analyticsService.onlineUsers(),
            totalMessages: await analyticsService.totalMessages()
        };
        res.json(data);
    }

    static async getActiveUsersPerChat(req: AuthRequest, res: Response) {
        const { roomId } = req.params;
        const count = await analyticsService.activeUsersPerChat(roomId);
        res.json({ roomId, activeUsers: count });
    }

    static async getUserMessageCount(req: AuthRequest, res: Response) {
        const { userId } = req.params;
        const count = await analyticsService.messagesByUser(userId);
        res.json({ userId, messageCount: count });
    }

    static async getRoomStats(req: AuthRequest, res: Response) {
        const { roomId } = req.params;
        const stats = await analyticsService.roomStats(roomId);
        res.json(stats);
    }

    static async getUserStats(req: AuthRequest, res: Response) {
        const { userId } = req.params;
        const stats = await analyticsService.userChatStats(userId);
        res.json(stats);
    }
}