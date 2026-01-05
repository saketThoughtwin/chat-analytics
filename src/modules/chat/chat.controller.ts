import { Response } from "express";
import { AuthRequest } from "@middlewares/auth.middleware";
import { io } from "@realtime/socket.server";
import roomService from "./room.service";
import messageService from "./message.service";

export default class ChatController {
    /**
     * Create or get a direct chat room between two users
     * POST /api/chat/rooms
     */
    static async createOrGetRoom(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const { otherUserId } = req.body;

            if (!otherUserId) {
                return res.status(400).json({ message: "otherUserId is required" });
            }

            if (userId === otherUserId) {
                return res.status(400).json({ message: "Cannot create room with yourself" });
            }

            const room = await roomService.getOrCreateDirectRoom(userId!, otherUserId);
            res.status(200).json(room);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get all rooms for the authenticated user
     * GET /api/chat/rooms
     */
    static async getUserRooms(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const rooms = await roomService.getUserRooms(userId!, page, limit);
            res.json(rooms);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get room details by ID
     * GET /api/chat/rooms/:roomId
     */
    static async getRoomById(req: AuthRequest, res: Response) {
        try {
            const { roomId } = req.params;
            const room = await roomService.getRoomById(roomId);

            if (!room) {
                return res.status(404).json({ message: "Room not found" });
            }

            res.json(room);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Send a message to a room
     * POST /api/chat/rooms/:roomId/messages
     */
    static async sendMessage(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const { roomId } = req.params;
            const { message } = req.body;

            if (!message) {
                return res.status(400).json({ message: "Message is required" });
            }

            // Verify room exists and user is a participant
            const room = await roomService.getRoomById(roomId);
            if (!room) {
                return res.status(404).json({ message: "Room not found" });
            }

            if (!room.participants.includes(userId!)) {
                return res.status(403).json({ message: "You are not a participant in this room" });
            }

            // Determine receiver for direct chats
            const receiver = room.type === 'direct'
                ? room.participants.find(p => p !== userId)
                : undefined;

            const newMsg = await messageService.sendMessage({
                sender: userId!,
                roomId,
                message,
                receiver
            });

            // Emit to room via socket
            io.to(roomId).emit("receive_message", newMsg);

            res.status(201).json(newMsg);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get messages for a room with pagination
     * GET /api/chat/rooms/:roomId/messages
     */
    static async getMessages(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const { roomId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            // Verify user is a participant
            const room = await roomService.getRoomById(roomId);
            if (!room) {
                return res.status(404).json({ message: "Room not found" });
            }

            if (!room.participants.includes(userId!)) {
                return res.status(403).json({ message: "You are not a participant in this room" });
            }

            const result = await messageService.getMessages(roomId, { page, limit });
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Mark messages as read
     * PUT /api/chat/messages/read
     */
    static async markAsRead(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const { messageIds } = req.body;

            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({ message: "messageIds array is required" });
            }

            await messageService.markAsRead(messageIds, userId!);

            // Emit read receipt to senders
            io.emit("messages_read", { messageIds, readBy: userId });

            res.json({ message: "Messages marked as read" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Mark all messages in a room as read
     * PUT /api/chat/rooms/:roomId/read
     */
    static async markRoomAsRead(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const { roomId } = req.params;

            await messageService.markRoomAsRead(roomId, userId!);

            // Emit read receipt
            io.to(roomId).emit("room_read", { roomId, readBy: userId });

            res.json({ message: "Room marked as read" });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get unread message count for the user
     * GET /api/chat/unread
     */
    static async getUnreadCount(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const count = await messageService.getUnreadCount(userId!);
            res.json({ unreadCount: count });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get unread count for a specific room
     * GET /api/chat/rooms/:roomId/unread
     */
    static async getRoomUnreadCount(req: AuthRequest, res: Response) {
        try {
            const { userId } = req;
            const { roomId } = req.params;

            const count = await roomService.getRoomUnreadCount(roomId, userId!);
            res.json({ roomId, unreadCount: count });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Legacy endpoint for backward compatibility
     * GET /api/chat/:withUser
     */
    static async getConversation(req: AuthRequest, res: Response) {
        const { userId } = req;
        const { withUser } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        try {
            // Get or create room
            const room = await roomService.getOrCreateDirectRoom(userId!, withUser);

            // Get messages
            const result = await messageService.getMessages(room._id, { page, limit });

            res.json(result.messages);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}