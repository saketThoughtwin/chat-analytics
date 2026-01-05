import { Server, Socket } from "socket.io";
import http from "http";
import { redis } from "@config/redis";
import messageRepository from "@modules/chat/message.repository";
import { verifyToken } from "@utils/jwt";
import messageService from "@modules/chat/message.service";
export let io: Server;

// Track user's active rooms for cleanup on disconnect
const userRooms = new Map<string, Set<string>>();

export const initSocketServer = (server: http.Server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;

    if (userId) {
      await redis.sadd("online_users", userId);
      socket.join(userId);

      // Initialize user's room tracking
      if (!userRooms.has(userId)) {
        userRooms.set(userId, new Set());
      }

      // Broadcast user online status
      io.emit("user_online", { userId });
    }

    socket.on("join_room", async (roomId: string) => {
      socket.join(roomId);

      // Track active users in room with TTL
      await redis.sadd(`chat:active:${roomId}`, userId);
      await redis.expire(`chat:active:${roomId}`, 3600); // 1 hour TTL

      // Track user's joined rooms
      userRooms.get(userId)?.add(roomId);

      // Notify room members
      socket.to(roomId).emit("user_joined_room", { userId, roomId });

      // Send current active count
      const activeCount = await redis.scard(`chat:active:${roomId}`);
      socket.emit("room_active_count", { roomId, count: activeCount });
    });

    socket.on("leave_room", async (roomId: string) => {
      socket.leave(roomId);
      await redis.srem(`chat:active:${roomId}`, userId);

      // Remove from user's room tracking
      userRooms.get(userId)?.delete(roomId);

      // Notify room members
      socket.to(roomId).emit("user_left_room", { userId, roomId });

      // Send updated active count
      const activeCount = await redis.scard(`chat:active:${roomId}`);
      io.to(roomId).emit("room_active_count", { roomId, count: activeCount });
    });

    socket.on("typing", ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit("typing", { from: userId, roomId });
    });

    socket.on("stop_typing", ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit("stop_typing", { from: userId, roomId });
    });

    socket.on("send_message", async ({ roomId, message }: { roomId: string; message: string }) => {
      if (!userId || !roomId || !message) return;

      try {
        // This is handled via REST API now, but keeping for backward compatibility
        const newMsg = await messageRepository.create({
          sender: userId,
          roomId,
          message,
          read: false,
          deleted: false
        });

        // Emit to room
        io.to(roomId).emit("receive_message", newMsg);

        // Send delivery confirmation to sender
        socket.emit("message_sent", { messageId: newMsg._id, timestamp: newMsg.createdAt });

        // Mark as delivered for online recipients
        setTimeout(async () => {
          await messageService.markAsDelivered(newMsg._id.toString());
          io.to(roomId).emit("message_delivered", { messageId: newMsg._id });
        }, 100);

      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // Handle message delivery acknowledgment
    socket.on("message_delivered", async ({ messageId }: { messageId: string }) => {
      try {
        await messageService.markAsDelivered(messageId);
        io.emit("message_delivered", { messageId });
      } catch (error) {
        console.error("Error marking message as delivered:", error);
      }
    });

    // Handle read receipts
    socket.on("messages_read", async ({ roomId, messageIds }: { roomId: string; messageIds: string[] }) => {
      try {
        await messageService.markAsRead(messageIds, userId);
        io.to(roomId).emit("messages_read", { messageIds, readBy: userId });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("disconnect", async () => {
      if (userId) {
        await redis.srem("online_users", userId);

        // Remove from all active rooms
        const rooms = userRooms.get(userId);
        if (rooms) {
          for (const roomId of rooms) {
            await redis.srem(`chat:active:${roomId}`, userId);
            socket.to(roomId).emit("user_left_room", { userId, roomId });
          }
          userRooms.delete(userId);
        }

        // Broadcast user offline status
        io.emit("user_offline", { userId });
      }
    });
  });
};

