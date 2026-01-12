

import { Router } from "express";
import AnalyticsController from "@analytics/analytics.controller";
import { authMiddleware } from '../middlewares/auth.middleware';
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
import { RoutesConstants } from "../constants/route.constants";

const router = Router();

router.get(`${RoutesConstants.ANALYTICS.DEFAULT}${RoutesConstants.ANALYTICS.DASHBOARD}`, authMiddleware, asyncHandler(AnalyticsController.dashboard));
router.get(`${RoutesConstants.ANALYTICS.DEFAULT}${RoutesConstants.ANALYTICS.ACTIVE_USERS}`, authMiddleware, asyncHandler(AnalyticsController.getActiveUsersPerChat));
router.get(`${RoutesConstants.ANALYTICS.DEFAULT}${RoutesConstants.ANALYTICS.USER_MESSAGES}`, authMiddleware, asyncHandler(AnalyticsController.getUserMessageCount));
router.get(`${RoutesConstants.ANALYTICS.DEFAULT}${RoutesConstants.ANALYTICS.ROOM_STATS}`, authMiddleware, asyncHandler(AnalyticsController.getRoomStats));
router.get(`${RoutesConstants.ANALYTICS.DEFAULT}${RoutesConstants.ANALYTICS.USER_STATS}`, authMiddleware, asyncHandler(AnalyticsController.getUserStats));

export default router;