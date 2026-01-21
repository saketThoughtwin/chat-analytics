
import { Router } from "express";
import ChatController from "controller/chat.controller";
import { authMiddleware } from "@middlewares/auth.middleware";
import { rateLimitMiddleware } from "@middlewares/rateLimit.middleware";
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
import { RoutesConstants } from "../constants/route.constants";

const router = Router();

// Room management
router.post(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOMS}`, authMiddleware, asyncHandler(ChatController.createOrGetRoom));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOMS}`, authMiddleware, asyncHandler(ChatController.getUserRooms));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_BY_ID}`, authMiddleware, asyncHandler(ChatController.getRoomById));
router.delete(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_BY_ID}`, authMiddleware, asyncHandler(ChatController.deleteRoom));

// Messaging
router.post(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.MESSAGES}`, authMiddleware, rateLimitMiddleware, asyncHandler(ChatController.sendMessage));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.MESSAGES}`, authMiddleware, asyncHandler(ChatController.getMessages));

// Read receipts
router.put(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.READ_MESSAGES}`, authMiddleware, asyncHandler(ChatController.markAsRead));
router.put(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.READ_ROOM}`, authMiddleware, asyncHandler(ChatController.markRoomAsRead));

// Unread counts
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.UNREAD}`, authMiddleware, asyncHandler(ChatController.getUnreadCount));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_UNREAD}`, authMiddleware, asyncHandler(ChatController.getRoomUnreadCount));

// Legacy endpoint
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.CONVERSATION}`, authMiddleware, asyncHandler(ChatController.getConversation));

export default router;