
import { Router } from "express";
import ChatController from "controller/chat.controller";
import { authMiddleware } from "@middlewares/auth.middleware";
import { rateLimitMiddleware } from "@middlewares/rateLimit.middleware";
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
import { RoutesConstants } from "../constants/route.constants";
import { upload } from "../services/cloudinary.service";

const router = Router();

// Room management
router.post(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOMS}`, authMiddleware, asyncHandler(ChatController.createOrGetRoom));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOMS}`, authMiddleware, asyncHandler(ChatController.getUserRooms));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_BY_ID}`, authMiddleware, asyncHandler(ChatController.getRoomById));
router.delete(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_BY_ID}`, authMiddleware, asyncHandler(ChatController.deleteRoom));

// Messaging
router.post(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.MESSAGES}`, authMiddleware, rateLimitMiddleware, asyncHandler(ChatController.sendMessage));
router.post(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_BY_ID_UPLOAD}`, authMiddleware, upload.single('file'), asyncHandler(ChatController.sendMediaMessage));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.MESSAGES}`, authMiddleware, asyncHandler(ChatController.getMessages));

// Read receipts
router.put(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.READ_MESSAGES}`, authMiddleware, asyncHandler(ChatController.markAsRead));
router.put(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.READ_ROOM}`, authMiddleware, asyncHandler(ChatController.markRoomAsRead));

// Unread counts
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.UNREAD}`, authMiddleware, asyncHandler(ChatController.getUnreadCount));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ROOM_UNREAD}`, authMiddleware, asyncHandler(ChatController.getRoomUnreadCount));

// Message actions
router.delete(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.DELETE_MESSAGE}`, authMiddleware, asyncHandler(ChatController.deleteMessage));
router.put(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.STAR_MESSAGE}`, authMiddleware, asyncHandler(ChatController.toggleStarMessage));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.STARRED_MESSAGES}`, authMiddleware, asyncHandler(ChatController.getStarredMessages));
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.ALL_STARRED_MESSAGES}`, authMiddleware, asyncHandler(ChatController.getAllStarredMessages));

// Legacy endpoint
router.get(`${RoutesConstants.CHAT.DEFAULT}${RoutesConstants.CHAT.CONVERSATION}`, authMiddleware, asyncHandler(ChatController.getConversation));

export default router;