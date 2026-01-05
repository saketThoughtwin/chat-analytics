/**
 * @swagger
 * /api/chat/rooms:
 *   post:
 *     tags: [Chat]
 *     summary: Create or get a direct chat room with another user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otherUserId:
 *                 type: string
 *                 description: User ID to chat with
 *     responses:
 *       200:
 *         description: Room created or retrieved
 *       400:
 *         description: Bad request
 *   get:
 *     tags: [Chat]
 *     summary: Get all chat rooms for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of rooms
 * 
 * /api/chat/rooms/{roomId}:
 *   get:
 *     tags: [Chat]
 *     summary: Get room details
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
 *         description: Room details
 *       404:
 *         description: Room not found
 * 
 * /api/chat/rooms/{roomId}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send a message to a room
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Room not found
 *       429:
 *         description: Too many requests
 *   get:
 *     tags: [Chat]
 *     summary: Get messages for a room with pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated messages
 *       403:
 *         description: Not a participant
 * 
 * /api/chat/rooms/{roomId}/read:
 *   put:
 *     tags: [Chat]
 *     summary: Mark all messages in room as read
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
 *         description: Room marked as read
 * 
 * /api/chat/rooms/{roomId}/unread:
 *   get:
 *     tags: [Chat]
 *     summary: Get unread count for a specific room
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
 *         description: Unread count
 * 
 * /api/chat/messages/read:
 *   put:
 *     tags: [Chat]
 *     summary: Mark specific messages as read
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Messages marked as read
 * 
 * /api/chat/unread:
 *   get:
 *     tags: [Chat]
 *     summary: Get total unread message count
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 * 
 * /api/chat/{withUser}:
 *   get:
 *     tags: [Chat]
 *     summary: Get chat conversation (legacy endpoint)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: withUser
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Chat messages
 */
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