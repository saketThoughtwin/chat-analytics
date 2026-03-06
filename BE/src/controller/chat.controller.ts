import { Response } from "express";
import { AuthRequest } from "@middlewares/auth.middleware";
import { io } from "@realtime/socket.server";
import roomService from "@modules/chat/room.service";
import messageService from "@modules/chat/message.service";
import messageRepository from "@modules/chat/message.repository";
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
   * Create a group chat room
   * POST /api/chat/rooms/group
   */
  static async createGroupRoom(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { participants, name } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      throw new ApiError(400, "participants array is required");
    }

    if (!name) throw new ApiError(400, "Group name is required");

    // Add creator to participants if not already there
    const allParticipants = participants.includes(userId!)
      ? participants
      : [...participants, userId!];

    const room = await roomService.createGroupRoom(allParticipants, name, userId!);
    res.status(201).json(room);
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

    // Transform rooms to include unreadCount for the current user
    const transformedRooms = rooms.map(room => {
      const unreadCount = room.unreadCounts instanceof Map
        ? room.unreadCounts.get(userId!) || 0
        : (room.unreadCounts as any)?.[userId!] || 0;

      // Determine last message preview for improved RoomList
      let lastMessagePreview = "No messages yet";
      let lastMessage = room.lastMessage;

      if (room.lastMessage) {
        // Ensure lastMessage has createdAt for frontend consistency
        lastMessage = {
          ...room.lastMessage,
          _id: (room.lastMessage as any).messageId,
          createdAt: (room.lastMessage as any).timestamp || (room.lastMessage as any).createdAt
        } as any;

        if ((room.lastMessage as any).type === 'image') {
          lastMessagePreview = '📷 Photo';
        } else if ((room.lastMessage as any).type === 'video') {
          lastMessagePreview = '🎥 Video';
        } else {
          lastMessagePreview = (room.lastMessage as any).message;
        }
      }

      return {
        ...room,
        lastMessage,
        unreadCount,
        lastMessagePreview // Add the new preview field
      };
    });

    res.json(transformedRooms);
  }

  /**
   * Get room details by ID
   * GET /api/chat/rooms/:roomId
   */
  static async getRoomById(req: AuthRequest, res: Response) {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId);

    if (!room) throw new ApiError(404, "Room not found");

    const userId = req.userId;
    const unreadCount = room.unreadCounts instanceof Map
      ? room.unreadCounts.get(userId!) || 0
      : (room.unreadCounts as any)?.[userId!] || 0;

    // Ensure lastMessage has _id and createdAt for consistency
    const lastMessage = room.lastMessage ? {
      ...room.lastMessage,
      _id: (room.lastMessage as any).messageId,
      createdAt: (room.lastMessage as any).timestamp || (room.lastMessage as any).createdAt
    } as any : undefined;

    res.json({ ...room, lastMessage, unreadCount });
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

    // Check online participants and mark as delivered
    const onlineParticipants: string[] = [];
    for (const participant of room.participants) {
      const pId = (participant as any)._id ? (participant as any)._id.toString() : participant.toString();
      if (pId !== userId) {
        const isOnline = await messageService.isUserOnline(pId);
        if (isOnline) {
          onlineParticipants.push(pId);
        }
      }
    }

    if (onlineParticipants.length > 0) {
      for (const pId of onlineParticipants) {
        await messageService.markAsDelivered([newMsg._id.toString()], pId);
      }
      io.to(roomId).emit("message_delivered", { messageId: newMsg._id, roomId });
    }



    res.status(201).json(newMsg);
  }

  /**
   * Send a media message (image/video) to a room
   * POST /api/chat/rooms/:roomId/upload
   */
  static async sendMediaMessage(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;
    const file = req.file;

    if (!file) throw new ApiError(400, "File is required");

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

    const isVideo = file.mimetype.startsWith('video');
    const isAudio = file.mimetype.startsWith('audio');
    const type = isVideo ? 'video' : isAudio ? 'audio' : 'image';

    const newMsg = await messageService.sendMessage({
      sender: userId!,
      roomId,
      message: '',
      type,
      mediaUrl: (file as any).path, // Cloudinary URL is stored in 'path' by multer-storage-cloudinary
      receiver,
    });

    console.log(`Media message sent: ${type}, URL: ${(file as any).path}`);

    // Check online participants and mark as delivered
    const onlineParticipants: string[] = [];
    for (const participant of room.participants) {
      const pId = (participant as any)._id ? (participant as any)._id.toString() : participant.toString();
      if (pId !== userId) {
        const isOnline = await messageService.isUserOnline(pId);
        if (isOnline) {
          onlineParticipants.push(pId);
        }
      }
    }

    if (onlineParticipants.length > 0) {
      for (const pId of onlineParticipants) {
        await messageService.markAsDelivered([newMsg._id.toString()], pId);
      }
      io.to(roomId).emit("message_delivered", { messageId: newMsg._id, roomId });
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

    // Transform messages to include 'starred' boolean for current user
    const transformedMessages = result.messages.map(m => ({
      ...m,
      starred: m.starredBy?.includes(userId!) || false,
      starredBy: undefined
    }));

    res.json({
      ...result,
      messages: transformedMessages
    });
  }

  /**
   * Mark messages as read
   * PUT /api/chat/messages/read
   */
  static async markAsRead(req: AuthRequest, res: Response) {

    const { userId } = req;
    const { messageIds, roomId } = req.body;

    if (!Array.isArray(messageIds) || !messageIds.length)
      throw new ApiError(400, "messageIds array is required");

    await messageService.markAsRead(messageIds, userId!);

    // Emit read receipt to room
    if (roomId) {
      io.to(roomId).emit("messages_read", { messageIds, readBy: userId, roomId });
    } else {
      // Fallback if roomId is missing
      io.emit("messages_read", { messageIds, readBy: userId });
    }

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

  /**
   * Delete a room and all its messages
   * DELETE /api/chat/rooms/:roomId
   */
  static async deleteRoom(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;

    // Verify room exists and user is a participant
    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");

    if (!room.participants.some((p: any) => (p._id || p).toString() === userId)) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    // Delete all messages in the room
    await messageService.deleteMessagesByRoomId(roomId);

    // Delete the room itself
    await roomService.deleteRoom(roomId);

    res.json({ message: "Chat deleted successfully" });
  }

  /**
   * Update room details (group name, etc.)
   * PATCH /api/chat/rooms/:roomId
   */
  static async updateRoom(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;
    const { name, participants } = req.body;

    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");

    // Only allow participants to update the room
    const isParticipant = room.participants.some((p: any) => (p._id || p).toString() === userId);
    if (!isParticipant) throw new ApiError(403, "Forbidden");


    const updatedRoom = await roomService.updateRoom(roomId, { name, participants });

    // Notify participants of the update
    io.to(roomId).emit("room_update", updatedRoom);

    res.json(updatedRoom);
  }

  static async leaveGroup(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;

    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");
    if (room.type !== 'group') throw new ApiError(400, "Not a group chat");

    const user = room.participants.find((p: any) => (p._id || p).toString() === userId);
    if (!user) throw new ApiError(403, "Not a member of this group");


    const updatedRoom = await roomService.leaveGroup(roomId, userId!);

    // Create system message
    const systemMsg = await messageRepository.create({
      sender: undefined,

      roomId,
      message: `${(user as any).name || 'A user'} left the group`,
      type: 'system',
      read: true,
      deleted: false
    });

    if (updatedRoom) {
      // Notify remaining participants
      io.to(roomId).emit("receive_message", systemMsg);
      io.to(roomId).emit("room_update", updatedRoom);
    }

    res.status(200).json({ status: "success", message: "Left group successfully" });
  }


  /**
   * Delete a message
   * DELETE /api/chat/messages/:messageId
   */
  static async deleteMessage(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { messageId } = req.params;

    const deletedMsg = await messageService.deleteMessage(messageId, userId!);
    if (!deletedMsg) throw new ApiError(404, "Message not found or you are not the sender");

    const roomId = deletedMsg.roomId;

    // Refresh room's last message if needed
    const room = await roomService.getRoomById(roomId);
    if (room && room.lastMessage?.messageId.toString() === messageId) {
      await roomService.refreshRoomLastMessage(roomId);
      // Fetch updated room to get new preview
      const updatedRoom = await roomService.getRoomById(roomId);
      if (updatedRoom) {
        io.to(roomId).emit("room_update", updatedRoom);
      }
    }

    // Emit 'message_deleted' to room
    io.to(roomId).emit("message_deleted", { messageId, roomId });

    res.json({ message: "Message deleted successfully", messageId, roomId });
  }

  /**
   * Toggle star message
   * PUT /api/chat/messages/:messageId/star
   */
  static async toggleStarMessage(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { messageId } = req.params;
    const { starred } = req.body;

    if (typeof starred !== 'boolean') throw new ApiError(400, "starred boolean is required");

    const message = await messageService.toggleStarMessage(messageId, userId!, starred);
    if (!message) throw new ApiError(404, "Message not found");

    // Transform for response
    const transformed = {
      ...message.toObject(),
      starredBy: undefined,
      starred: message.starredBy.includes(userId!)
    };

    res.json(transformed);
  }

  /**
   * Get starred messages for a room
   * GET /api/chat/rooms/:roomId/starred
   */
  static async getStarredMessages(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;
    const messages = await messageService.getStarredMessages(roomId, userId!);

    const transformed = messages.map(m => ({
      ...m,
      starred: true // Since we filtered by this user's starring
    }));

    res.json(transformed);
  }

  /**
   * Get all starred messages for the user
   * GET /api/chat/starred
   */
  static async getAllStarredMessages(req: AuthRequest, res: Response) {
    const { userId } = req;
    const messages = await messageService.getAllStarredMessages(userId!);

    const transformed = messages.map(m => ({
      ...m,
      starred: true
    }));

    res.json(transformed);
  }
}
