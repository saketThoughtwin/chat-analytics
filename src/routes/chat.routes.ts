
import { Router } from "express";
import ChatController from "@modules/chat/chat.controller";
import { authMiddleware } from "@middlewares/auth.middleware";
import { rateLimitMiddleware } from "@middlewares/rateLimit.middleware";
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
const router = Router();

// Room management
router.post('/chat/rooms', authMiddleware, asyncHandler(ChatController.createOrGetRoom));
router.get('/chat/rooms', authMiddleware, asyncHandler(ChatController.getUserRooms));
router.get('/chat/rooms/:roomId', authMiddleware,asyncHandler( ChatController.getRoomById));

// Messaging
router.post('/chat/rooms/:roomId/messages', authMiddleware, rateLimitMiddleware, asyncHandler(ChatController.sendMessage));
router.get('/chat/rooms/:roomId/messages', authMiddleware, asyncHandler(ChatController.getMessages));

// Read receipts
router.put('/chat/messages/read', authMiddleware, asyncHandler(ChatController.markAsRead));
router.put('/chat/rooms/:roomId/read', authMiddleware, asyncHandler(ChatController.markRoomAsRead));

// Unread counts
router.get('/chat/unread', authMiddleware, asyncHandler(ChatController.getUnreadCount));
router.get('/chat/rooms/:roomId/unread', authMiddleware, asyncHandler(ChatController.getRoomUnreadCount));

// Legacy endpoint
router.get('/chat/:withUser', authMiddleware, asyncHandler(ChatController.getConversation));

export default router;