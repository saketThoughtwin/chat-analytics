
import { Router } from "express";
import ChatController from "@modules/chat/chat.controller";
import { authMiddleware } from "@middlewares/auth.middleware";
import { rateLimitMiddleware } from "@middlewares/rateLimit.middleware";

const router = Router();

// Room management
router.post('/chat/rooms', authMiddleware, ChatController.createOrGetRoom);
router.get('/chat/rooms', authMiddleware, ChatController.getUserRooms);
router.get('/chat/rooms/:roomId', authMiddleware, ChatController.getRoomById);

// Messaging
router.post('/chat/rooms/:roomId/messages', authMiddleware, rateLimitMiddleware, ChatController.sendMessage);
router.get('/chat/rooms/:roomId/messages', authMiddleware, ChatController.getMessages);

// Read receipts
router.put('/chat/messages/read', authMiddleware, ChatController.markAsRead);
router.put('/chat/rooms/:roomId/read', authMiddleware, ChatController.markRoomAsRead);

// Unread counts
router.get('/chat/unread', authMiddleware, ChatController.getUnreadCount);
router.get('/chat/rooms/:roomId/unread', authMiddleware, ChatController.getRoomUnreadCount);

// Legacy endpoint
router.get('/chat/:withUser', authMiddleware, ChatController.getConversation);

export default router;