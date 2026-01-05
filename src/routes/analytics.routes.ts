/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: System analytics dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthorized
 * 
 * /api/analytics/chat/{roomId}/active:
 *   get:
 *     tags: [Analytics]
 *     summary: Get active users count in a chat room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active users count
 * 
 * /api/analytics/users/{userId}/messages:
 *   get:
 *     tags: [Analytics]
 *     summary: Get message count for a specific user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User message count
 * 
 * /api/analytics/rooms/{roomId}/stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get comprehensive room statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room statistics
 * 
 * /api/analytics/users/{userId}/stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get user chat statistics
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User chat statistics
 */

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

