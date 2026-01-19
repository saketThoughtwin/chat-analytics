import { Response } from "express";
import { AuthRequest } from "@middlewares/auth.middleware";
import { io } from "@realtime/socket.server";
import roomService from "@modules/chat/room.service";
import messageService from "@modules/chat/message.service";
import { ApiError } from "@utils/ApiError";

export default class ChatController {
  /**
   * Create or get a direct chat room between two users
   * POST /api/chat/rooms
   */
  static async createOrGetRoom(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { otherUserId } = req.body;

    if (!otherUserId) throw new ApiError(400, "otherUserId is required");

    if (userId === otherUserId)
      throw new ApiError(400, "Cannot create room with yourself");

    const room = await roomService.getOrCreateDirectRoom(userId!, otherUserId);
    res.status(200).json(room);
  }

  /**
   * Get all rooms for the authenticated user
   * GET /api/chat/rooms
   */
  static async getUserRooms(req: AuthRequest, res: Response) {
    const { userId } = req;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const rooms = await roomService.getUserRooms(userId!, page, limit);
    res.json(rooms);
  }

  /**
   * Get room details by ID
   * GET /api/chat/rooms/:roomId
   */
  static async getRoomById(req: AuthRequest, res: Response) {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId);

    if (!room) throw new ApiError(404, "Room not found");

    res.json(room);
  }

  /**
   * Send a message to a room
   * POST /api/chat/rooms/:roomId/messages
   */
  static async sendMessage(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;
    const { message } = req.body;
    if (!message) throw new ApiError(400, "Message is required");

    // Verify room exists and user is a participant
    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");

    if (!room.participants.some((p: any) => (p._id || p).toString() === userId)) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    // Determine receiver for direct chats
    const receiverObj =
      room.type === "direct"
        ? room.participants.find((p: any) => (p._id || p).toString() !== userId)
        : undefined;
    const receiver = receiverObj ? ((receiverObj as any)._id || receiverObj).toString() : undefined;

    const newMsg = await messageService.sendMessage({
      sender: userId!,
      roomId,
      message,
      receiver,
    });

    // Emit to room via socket
    io.to(roomId).emit("receive_message", newMsg);

    // Also emit to receiver's personal room if it's a direct chat
    // This ensures the recipient sees the new room/message instantly
    if (receiver) {
      io.to(receiver).emit("receive_message", newMsg);
    }

    res.status(201).json(newMsg);
  }

  /**
   * Get messages for a room with pagination
   * GET /api/chat/rooms/:roomId/messages
   */
  static async getMessages(req: AuthRequest, res: Response) {

    const { userId } = req;
    const { roomId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Verify user is a participant
    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");

    if (!room.participants.some((p: any) => (p._id || p).toString() === userId)) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    const result = await messageService.getMessages(roomId, { page, limit });
    res.json(result);
  }

  /**
   * Mark messages as read
   * PUT /api/chat/messages/read
   */
  static async markAsRead(req: AuthRequest, res: Response) {

    const { userId } = req;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || !messageIds.length)
      throw new ApiError(400, "messageIds array is required");

    await messageService.markAsRead(messageIds, userId!);

    // Emit read receipt to senders
    io.emit("messages_read", { messageIds, readBy: userId });

    res.json({ message: "Messages marked as read" });
  }

  /**
   * Mark all messages in a room as read
   * PUT /api/chat/rooms/:roomId/read
   */
  static async markRoomAsRead(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;

    await messageService.markRoomAsRead(roomId, userId!);

    // Emit read receipt
    io.to(roomId).emit("room_read", { roomId, readBy: userId });

    res.json({ message: "Room marked as read" });
  }

  /**
   * Get unread message count for the user
   * GET /api/chat/unread
   */
  static async getUnreadCount(req: AuthRequest, res: Response) {
    const { userId } = req;
    const count = await messageService.getUnreadCount(userId!);
    res.json({ unreadCount: count });
  }

  /**
   * Get unread count for a specific room
   * GET /api/chat/rooms/:roomId/unread
   */
  static async getRoomUnreadCount(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;
    const count = await roomService.getRoomUnreadCount(roomId, userId!);
    res.json({ roomId, unreadCount: count });
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

    // Get or create room
    const room = await roomService.getOrCreateDirectRoom(userId!, withUser);

    // Get messages
    const result = await messageService.getMessages(room._id, {
      page,
      limit,
    });
    res.json(result.messages);
  }
}
