import { Response } from "express";
import { AuthRequest } from "@middlewares/auth.middleware";
import { io } from "@realtime/socket.server";
import { redis } from "@config/redis";
import roomService from "@modules/chat/room.service";
import messageService from "@modules/chat/message.service";
import messageRepository from "@modules/chat/message.repository";
import userRepository from "@modules/users/user.repository";
import { ApiError } from "@utils/ApiError";

const toPlainRoom = (room: any) =>
  room && typeof room.toObject === "function" ? room.toObject() : room;

const createSystemMessageAndBumpRoom = async ({
  roomId,
  text,
  bumpedByUserId,
}: {
  roomId: string;
  text: string;
  bumpedByUserId: string;
}) => {
  const systemMsg = await messageRepository.create({
    sender: undefined,
    roomId,
    message: text,
    type: "system",
    read: true,
    deleted: false,
  });

  await roomService.updateRoomLastMessage(
    roomId,
    systemMsg._id.toString(),
    text,
    bumpedByUserId,
  );

  return systemMsg;
};

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

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      throw new ApiError(400, "participants array is required");
    }

    if (!name) throw new ApiError(400, "Group name is required");

    // Add creator to participants if not already there
    const allParticipants = participants.includes(userId!)
      ? participants
      : [...participants, userId!];

    const room = await roomService.createGroupRoom(
      allParticipants,
      name,
      userId!,
    );

    // Populate room with participant details for room_update payloads
    const populatedRoom = await roomService.getRoomById(room._id);
    if (!populatedRoom) throw new ApiError(500, "Failed to load created room");

    const creator =
      populatedRoom.participants.find(
        (p: any) => (p?._id || p)?.toString?.() === userId,
      ) || null;
    const creatorName = (creator as any)?.name || "Admin";

    // WhatsApp-like system messages
    await createSystemMessageAndBumpRoom({
      roomId: room._id,
      text: `${creatorName} created group "${name}"`,
      bumpedByUserId: userId!,
    });
    const addedParticipants: string[] = [];
    for (const participant of populatedRoom.participants) {
      const participantId = (
        (participant as any)?._id || participant
      )?.toString?.();
      if (!participantId || participantId === userId) continue;
      const participantName = (participant as any)?.name || "A user";
      addedParticipants.push(participantName);
    }
    if (addedParticipants.length > 0) {
      await createSystemMessageAndBumpRoom({
        roomId: room._id,
        text: `${creatorName} added ${addedParticipants.join(", ")}`,
        bumpedByUserId: userId!,
      });
    }

    // Fetch latest room state (includes lastMessage updates)
    const latestRoom = await roomService.getRoomById(room._id);
    const payload = toPlainRoom(latestRoom || populatedRoom);

    // Push room to all participants instantly (no refresh)
    const participantIds = (payload.participants || [])
      .map((p: any) => (p?._id || p)?.toString?.())
      .filter(Boolean);
    participantIds.forEach((id: string) =>
      io.to(id).emit("room_update", payload),
    );

    // Also emit to the room channel (for clients that joined early)
    io.to(room._id).emit("room_update", payload);

    res.status(201).json(payload);
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
    const transformedRooms = rooms.map((room) => {
      const unreadCount =
        room.unreadCounts instanceof Map
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
          createdAt:
            (room.lastMessage as any).timestamp ||
            (room.lastMessage as any).createdAt,
        } as any;

        if ((room.lastMessage as any).type === "image") {
          lastMessagePreview = "📷 Photo";
        } else if ((room.lastMessage as any).type === "video") {
          lastMessagePreview = "🎥 Video";
        } else {
          lastMessagePreview = (room.lastMessage as any).message;
        }
      }

      return {
        ...room,
        lastMessage,
        unreadCount,
        lastMessagePreview, // Add the new preview field
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
    const unreadCount =
      room.unreadCounts instanceof Map
        ? room.unreadCounts.get(userId!) || 0
        : (room.unreadCounts as any)?.[userId!] || 0;

    // Ensure lastMessage has _id and createdAt for consistency
    const lastMessage = room.lastMessage
      ? ({
          ...room.lastMessage,
          _id: (room.lastMessage as any).messageId,
          createdAt:
            (room.lastMessage as any).timestamp ||
            (room.lastMessage as any).createdAt,
        } as any)
      : undefined;

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

    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    const hasLeft = room.leftParticipants?.some(
      (p: any) => (p._id || p).toString() === userId,
    );

    if (!isParticipant && !hasLeft) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    // If a user is re-added but still present in leftParticipants (stale state),
    // treat "participants" as the source of truth.
    if (hasLeft && !isParticipant) {
      throw new ApiError(
        403,
        "You have left this group and cannot send messages",
      );
    }

    // Determine receiver for direct chats
    const receiverObj =
      room.type === "direct"
        ? room.participants.find((p: any) => (p._id || p).toString() !== userId)
        : undefined;
    const receiver = receiverObj
      ? ((receiverObj as any)._id || receiverObj).toString()
      : undefined;

    const senderObj = room.participants.find(
      (p: any) => ((p as any)._id || p).toString() === userId,
    );
    const senderName =
      typeof senderObj === "object" ? (senderObj as any).name : undefined;

    const newMsg = await messageService.sendMessage({
      sender: userId!,
      senderName,
      roomId,
      message,
      receiver,
    });

    // Emit:
    // - Direct: room broadcast + receiver channel (legacy + reliability)
    // - Group: per-participant channels only (prevents leavers from seeing future messages)
    if (room.type === "group") {
      const participantIds = room.participants
        .map((p: any) => ((p as any)._id || p).toString())
        .filter(Boolean);
      participantIds.forEach((id: string) => io.to(id).emit("receive_message", newMsg));
    } else {
      io.to(roomId).emit("receive_message", newMsg);
    }

    // Also emit to receiver specifically for reliability in direct chats
    if (receiver) {
      io.to(receiver).emit("receive_message", newMsg);
    }

    // Check online participants and mark as delivered
    const onlineParticipants: string[] = [];
    for (const participant of room.participants) {
      const pId = (participant as any)._id
        ? (participant as any)._id.toString()
        : participant.toString();
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
        // Inform sender (and others) that this specific user delivered the message
        io.to(roomId).emit("message_delivered", {
          messageId: newMsg._id,
          roomId,
          userId: pId,
          at: new Date(),
        });
      }
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

    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    const hasLeft = room.leftParticipants?.some(
      (p: any) => (p._id || p).toString() === userId,
    );

    if (!isParticipant && !hasLeft) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    // If a user is re-added but still present in leftParticipants (stale state),
    // treat "participants" as the source of truth.
    if (hasLeft && !isParticipant) {
      throw new ApiError(
        403,
        "You have left this group and cannot send messages",
      );
    }

    // Determine receiver for direct chats
    const receiverObj =
      room.type === "direct"
        ? room.participants.find((p: any) => (p._id || p).toString() !== userId)
        : undefined;
    const receiver = receiverObj
      ? ((receiverObj as any)._id || receiverObj).toString()
      : undefined;

    const isVideo = file.mimetype.startsWith("video");
    const isAudio = file.mimetype.startsWith("audio");
    const type = isVideo ? "video" : isAudio ? "audio" : "image";

    const senderObj = room.participants.find(
      (p: any) => ((p as any)._id || p).toString() === userId,
    );
    const senderName =
      typeof senderObj === "object" ? (senderObj as any).name : undefined;

    const newMsg = await messageService.sendMessage({
      sender: userId!,
      senderName,
      roomId,
      message: "",
      type,
      mediaUrl: (file as any).path, // Cloudinary URL is stored in 'path' by multer-storage-cloudinary
      receiver,
    });

    // Emit:
    // - Direct: room broadcast + receiver channel
    // - Group: per-participant channels only (prevents leavers from seeing future messages)
    if (room.type === "group") {
      const participantIds = room.participants
        .map((p: any) => ((p as any)._id || p).toString())
        .filter(Boolean);
      participantIds.forEach((id: string) => io.to(id).emit("receive_message", newMsg));
    } else {
      io.to(roomId).emit("receive_message", newMsg);
      if (receiver) io.to(receiver).emit("receive_message", newMsg);
    }

    console.log(`Media message sent: ${type}, URL: ${(file as any).path}`);

    // Check online participants and mark as delivered
    const onlineParticipants: string[] = [];
    for (const participant of room.participants) {
      const pId = (participant as any)._id
        ? (participant as any)._id.toString()
        : participant.toString();
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
        // Inform sender (and others) that this specific user delivered the message
        io.to(roomId).emit("message_delivered", {
          messageId: newMsg._id,
          roomId,
          userId: pId,
          at: new Date(),
        });
      }
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

    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    const hasLeft = room.leftParticipants?.some(
      (p: any) => (p._id || p).toString() === userId,
    );

    if (!isParticipant && !hasLeft) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    // If user left a group, they should only see their own "left" system notification.
    if (room.type === "group" && !isParticipant && hasLeft) {
      const user = await userRepository.findById(userId!);
      const userName = user?.name;
      if (!userName) {
        return res.json({ messages: [], hasMore: false, total: 0 });
      }

      const rawLeftAtBy = (room as any).leftAtBy;
      const leftAt =
        rawLeftAtBy instanceof Map
          ? rawLeftAtBy.get(userId!)
          : rawLeftAtBy?.[userId!];

      const leftAtDate = leftAt ? new Date(leftAt) : undefined;
      const slackAtOrBefore = leftAtDate
        ? new Date(leftAtDate.getTime() + 10_000) // allow small clock/ordering drift
        : undefined;

      let leaveMsg = await messageRepository.findLatestSystemLeaveMessage(
        roomId,
        userName,
        slackAtOrBefore ? { atOrBefore: slackAtOrBefore } : undefined,
      );

      if (!leaveMsg) {
        leaveMsg = await messageRepository.findLatestSystemLeaveMessage(roomId, userName);
      }

      const transformed = leaveMsg
        ? [{ ...leaveMsg, starred: false, starredBy: undefined }]
        : [
            {
              _id: `left_${roomId}_${userId}`,
              sender: undefined,
              roomId,
              message: `${userName} left`,
              type: "system",
              read: true,
              deleted: false,
              createdAt: (leftAtDate || new Date()).toISOString(),
            } as any,
          ];

      return res.json({
        messages: transformed,
        hasMore: false,
        total: transformed.length,
      });
    }

    // If user has left a group, hide any future messages after their leave time.
    let filter: any = undefined;
    if (!isParticipant && hasLeft) {
      const rawLeftAtBy = (room as any).leftAtBy;
      const leftAt =
        rawLeftAtBy instanceof Map
          ? rawLeftAtBy.get(userId!)
          : rawLeftAtBy?.[userId!];

      if (leftAt) {
        filter = { createdAt: { $lte: new Date(leftAt) } };
      } else {
        // Backward-compat: if we don't know when they left, hide everything for safety.
        filter = { createdAt: { $lte: new Date(0) } };
      }
    }

    const result = await messageService.getMessages(roomId, { page, limit }, filter);

    // Ensure group sender names are available even after users leave.
    // (Old messages may not have senderName persisted.)
    const nameById = new Map<string, string>();
    const upsertName = (id: any, name: any) => {
      const key = id?.toString?.();
      const val = typeof name === "string" ? name : undefined;
      if (key && val && !nameById.has(key)) nameById.set(key, val);
    };

    // From populated room participants/leftParticipants if available
    (room.participants || []).forEach((p: any) =>
      upsertName((p as any)?._id || p, (p as any)?.name),
    );
    (room.leftParticipants || []).forEach((p: any) =>
      upsertName((p as any)?._id || p, (p as any)?.name),
    );

    // Fill gaps from users collection in one query
    const senderIds = Array.from(
      new Set(
        (result.messages || [])
          .map((m: any) => m?.sender?.toString?.())
          .filter(Boolean),
      ),
    );
    const missingIds = senderIds.filter((id) => !nameById.has(id));
    if (missingIds.length > 0) {
      const users = await userRepository.findAll({ _id: { $in: missingIds } });
      users.forEach((u: any) => upsertName(u?._id, u?.name));
    }

    // Transform messages to include 'starred' boolean for current user
    const transformedMessages = result.messages.map((m) => ({
      ...m,
      senderName: (m as any).senderName || (m as any).sender ? nameById.get((m as any).sender.toString()) : undefined,
      starred: m.starredBy?.includes(userId!) || false,
      starredBy: undefined,
    }));

    res.json({
      ...result,
      messages: transformedMessages,
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
      io.to(roomId).emit("messages_read", {
        messageIds,
        readBy: userId,
        userId: userId, // Keep both for compatibility
        roomId,
        at: new Date(),
      });
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

    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    const hasLeft = room.leftParticipants?.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    const isAdmin = room.groupAdmin === userId;

    if (!isParticipant && !isAdmin && !hasLeft) {
      throw new ApiError(403, "You are not a participant in this room");
    }

    if (room.type === "group" && !isAdmin && isParticipant) {
      throw new ApiError(403, "Only group admins can delete the room");
    }

    // If user has left, "deleting" means removing them from leftParticipants so it's hidden
    if (hasLeft && !isAdmin) {
      const updatedLeftParticipants = (room.leftParticipants || [])
        .map((p: any) => ((p as any)?._id || p)?.toString?.())
        .filter((id: any) => Boolean(id) && id !== userId && id !== "[object Object]");
      await roomService.updateRoom(roomId, {
        leftParticipants: updatedLeftParticipants,
      });
      io.to(userId!).emit("room_deleted", { roomId });
      return res.json({ message: "Chat removed successfully" });
    }

    const participantIds = (room.participants || [])
      .map((p: any) => ((p as any)?._id || p)?.toString?.())
      .filter(Boolean);
    const leftIds = (room.leftParticipants || [])
      .map((p: any) => ((p as any)?._id || p)?.toString?.())
      .filter(Boolean);
    const allUserIds = Array.from(
      new Set(
        [...participantIds, ...leftIds].filter((id) => id !== "[object Object]"),
      ),
    );

    // Notify all members to remove the room from their UI immediately
    allUserIds.forEach((id: string) => io.to(id).emit("room_deleted", { roomId }));
    await io.in(roomId).socketsLeave(roomId);
    await redis.del(`chat:active:${roomId}`);

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

    // For group rooms, only admin can update participants or change name
    const isAdmin = room.groupAdmin === userId;
    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );

    if (!isParticipant) throw new ApiError(403, "Forbidden");

    if (room.type === "group" && !isAdmin && (participants || name)) {
      throw new ApiError(
        403,
        "Only group admins can update group settings or members",
      );
    }

    const updateData: any = {};
    if (typeof name === "string") updateData.name = name;
    if (Array.isArray(participants)) {
      // Normalize IDs and ensure uniqueness
      const normalizedParticipants = Array.from(
        new Set(participants.map((id: any) => id?.toString()).filter(Boolean)),
      );

      updateData.participants = normalizedParticipants;

      // If someone left previously and is re-added, remove them from leftParticipants.
      // Otherwise they will still be blocked from sending messages and excluded from UI counts.
      const left = (room.leftParticipants || [])
        .map((p: any) => ((p as any)?._id || p)?.toString?.())
        .filter((id: any) => Boolean(id) && id !== "[object Object]");
      updateData.leftParticipants = left.filter(
        (id: string) => !normalizedParticipants.includes(id),
      );
    }

    const oldParticipants = room.participants.map((p: any) =>
      (p._id || p).toString(),
    );
    const updatedRoom = await roomService.updateRoom(roomId, updateData);

    if (updatedRoom && participants) {
      const normalizedNew = Array.isArray(updateData.participants)
        ? updateData.participants
        : [];
      const newParticipantIds = normalizedNew.filter(
        (id: string) => !oldParticipants.includes(id),
      );
      const removedParticipantIds = oldParticipants.filter(
        (id: string) => !normalizedNew.includes(id),
      );

      const adminName =
        (
          room.participants.find(
            (p: any) => (p._id || p).toString() === userId,
          ) as any
        )?.name || "Admin";

      // Handling Additions
      for (const newId of newParticipantIds) {
        const newUser = updatedRoom.participants.find(
          (p: any) => (p._id || p).toString() === newId.toString(),
        );
        const newUserName =
          typeof newUser === "object" ? (newUser as any).name : "A user";

        const systemMsg = await createSystemMessageAndBumpRoom({
          roomId,
          text: `${adminName} added ${newUserName}`,
          bumpedByUserId: userId!,
        });

        io.to(roomId).emit("receive_message", systemMsg);

        // Push room update to the newly-added user's channel so their room list updates live
        const latestRoomForNewUser = await roomService.getRoomById(roomId);
        io.to(newId.toString()).emit(
          "room_update",
          toPlainRoom(latestRoomForNewUser || updatedRoom),
        );
      }

      // Handling Removals
      for (const removedId of removedParticipantIds) {
        // Ensure removed users stop receiving live events for this group across all devices.
        await io.in(removedId.toString()).socketsLeave(roomId);
        await redis.srem(`chat:active:${roomId}`, removedId.toString());

        const removedUser = room.participants.find(
          (p: any) => (p._id || p).toString() === removedId,
        );
        const removedUserName =
          typeof removedUser === "object"
            ? (removedUser as any).name
            : "A user";

        const systemMsg = await createSystemMessageAndBumpRoom({
          roomId,
          text: `${adminName} removed ${removedUserName}`,
          bumpedByUserId: userId!,
        });

        io.to(roomId).emit("receive_message", systemMsg);
      }
    }

    // Notify participants of the update (ensure lastMessage is fresh if system messages were created)
    const latestRoom = await roomService.getRoomById(roomId);
    io.to(roomId).emit("room_update", toPlainRoom(latestRoom || updatedRoom));

    res.json(updatedRoom);
  }

  /**
   * Update group profile picture (admin only)
   * PATCH /api/chat/rooms/:roomId/avatar
   */
  static async updateGroupAvatar(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;

    if (!req.file?.path) throw new ApiError(400, "File is required");
    if (req.file.mimetype && !req.file.mimetype.startsWith("image/")) {
      throw new ApiError(400, "Only image files are allowed");
    }

    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");
    if (room.type !== "group") throw new ApiError(400, "Not a group chat");

    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    if (!isParticipant) throw new ApiError(403, "Forbidden");

    const isAdmin = room.groupAdmin === userId;
    if (!isAdmin)
      throw new ApiError(
        403,
        "Only group admins can update group profile picture",
      );

    const updatedRoom = await roomService.updateRoom(roomId, {
      avatar: req.file.path,
    });
    if (!updatedRoom) throw new ApiError(500, "Failed to update group avatar");

    // Notify room members and also user channels (covers users not currently joined to the room socket)
    const payload = toPlainRoom(updatedRoom);
    io.to(roomId).emit("room_update", payload);
    const participantIds = (updatedRoom.participants || [])
      .map((p: any) => (p?._id || p)?.toString?.())
      .filter(Boolean);
    participantIds.forEach((id: string) =>
      io.to(id).emit("room_update", payload),
    );

    res.json(updatedRoom);
  }

  /**
   * Remove group profile picture (admin only)
   * DELETE /api/chat/rooms/:roomId/avatar
   */
  static async removeGroupAvatar(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;

    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");
    if (room.type !== "group") throw new ApiError(400, "Not a group chat");

    const isParticipant = room.participants.some(
      (p: any) => (p._id || p).toString() === userId,
    );
    if (!isParticipant) throw new ApiError(403, "Forbidden");

    const isAdmin = room.groupAdmin === userId;
    if (!isAdmin)
      throw new ApiError(
        403,
        "Only group admins can remove group profile picture",
      );

    const updatedRoom = await roomService.updateRoom(roomId, { avatar: "" });
    if (!updatedRoom) throw new ApiError(500, "Failed to remove group avatar");

    const payload = toPlainRoom(updatedRoom);
    io.to(roomId).emit("room_update", payload);
    const participantIds = (updatedRoom.participants || [])
      .map((p: any) => (p?._id || p)?.toString?.())
      .filter(Boolean);
    participantIds.forEach((id: string) =>
      io.to(id).emit("room_update", payload),
    );

    res.json(updatedRoom);
  }

  static async leaveGroup(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { roomId } = req.params;

    const room = await roomService.getRoomById(roomId);
    if (!room) throw new ApiError(404, "Room not found");
    if (room.type !== "group") throw new ApiError(400, "Not a group chat");

    const user = room.participants.find(
      (p: any) => (p._id || p).toString() === userId,
    );
    if (!user) throw new ApiError(403, "Not a member of this group");

    // Ensure the leaver stops receiving live events for this group across all devices.
    await io.in(userId!).socketsLeave(roomId);
    await redis.srem(`chat:active:${roomId}`, userId!);

    const updatedRoom = await roomService.leaveGroup(roomId, userId!);

    // Create system message
    const systemMsg = await createSystemMessageAndBumpRoom({
      roomId,
      text: `${(user as any).name || "A user"} left`,
      bumpedByUserId: userId!,
    });

    if (updatedRoom) {
      // Notify remaining participants
      io.to(roomId).emit("receive_message", systemMsg);
      const latestRoom = await roomService.getRoomById(roomId);
      io.to(roomId).emit("room_update", toPlainRoom(latestRoom || updatedRoom));
    }

    res
      .status(200)
      .json({ status: "success", message: "Left group successfully" });
  }

  /**
   * Delete a message
   * DELETE /api/chat/messages/:messageId
   */
  static async deleteMessage(req: AuthRequest, res: Response) {
    const { userId } = req;
    const { messageId } = req.params;

    const deletedMsg = await messageService.deleteMessage(messageId, userId!);
    if (!deletedMsg)
      throw new ApiError(404, "Message not found or you are not the sender");

    const roomId = deletedMsg.roomId;

    // Refresh room's last message if needed
    const room = await roomService.getRoomById(roomId);
    if (room && room.lastMessage?.messageId.toString() === messageId) {
      await roomService.refreshRoomLastMessage(roomId);
      // Fetch updated room to get new preview
      const updatedRoom = await roomService.getRoomById(roomId);
      if (updatedRoom) {
        io.to(roomId).emit("room_update", toPlainRoom(updatedRoom));
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

    if (typeof starred !== "boolean")
      throw new ApiError(400, "starred boolean is required");

    const message = await messageService.toggleStarMessage(
      messageId,
      userId!,
      starred,
    );
    if (!message) throw new ApiError(404, "Message not found");

    // Transform for response
    const transformed = {
      ...message.toObject(),
      starredBy: undefined,
      starred: message.starredBy.includes(userId!),
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

    const transformed = messages.map((m) => ({
      ...m,
      starred: true, // Since we filtered by this user's starring
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

    const transformed = messages.map((m) => ({
      ...m,
      starred: true,
    }));

    res.json(transformed);
  }
}
