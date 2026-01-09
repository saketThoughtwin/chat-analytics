

import { Router } from "express";
import AnalyticsController from "@analytics/analytics.controller";
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
const router = Router();

router.get('/analytics/dashboard', authMiddleware, asyncHandler(AnalyticsController.dashboard));
router.get('/analytics/chat/:roomId/active', authMiddleware, asyncHandler(AnalyticsController.getActiveUsersPerChat));
router.get('/analytics/users/:userId/messages', authMiddleware, asyncHandler(AnalyticsController.getUserMessageCount));
router.get('/analytics/rooms/:roomId/stats', authMiddleware, asyncHandler(AnalyticsController.getRoomStats));
router.get('/analytics/users/:userId/stats', authMiddleware, asyncHandler(AnalyticsController.getUserStats));

export default router;