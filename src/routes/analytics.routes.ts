

import { Router } from "express";
import AnalyticsController from "@analytics/analytics.controller";
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/analytics/dashboard', authMiddleware, AnalyticsController.dashboard);
router.get('/analytics/chat/:roomId/active', authMiddleware, AnalyticsController.getActiveUsersPerChat);
router.get('/analytics/users/:userId/messages', authMiddleware, AnalyticsController.getUserMessageCount);
router.get('/analytics/rooms/:roomId/stats', authMiddleware, AnalyticsController.getRoomStats);
router.get('/analytics/users/:userId/stats', authMiddleware, AnalyticsController.getUserStats);

export default router;

