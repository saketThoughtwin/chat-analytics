import ChatMessage from '@modules/chat/chat.model';
import userRepository from '@modules/users/user.repository';
import { redis } from "@config/redis";

class AnalyticsService {

  async totalUsers() {
    return userRepository.count();
  }

  async onlineUsers() {
    return redis.scard('online_users');
  }

  async totalMessages() {
    return ChatMessage.countDocuments();
  }

  async messagesByUser(userId: string) {
    // Try Redis cache first
    const cached = await redis.get(`user:messages:${userId}`);
    if (cached) return parseInt(cached);

    // Fallback to database
    const count = await ChatMessage.countDocuments({ sender: userId, deleted: false });

    // Cache the result
    await redis.set(`user:messages:${userId}`, count.toString(), 'EX', 3600); // 1 hour TTL

    return count;
  }

  async activeUsersPerChat(roomId: string) {
    return redis.scard(`chat:active:${roomId}`);
  }

  async roomStats(roomId: string) {
    const [totalMessages, activeUsers] = await Promise.all([
      ChatMessage.countDocuments({ roomId, deleted: false }),
      redis.scard(`chat:active:${roomId}`)
    ]);

    return {
      roomId,
      totalMessages,
      activeUsers
    };
  }

  async userChatStats(userId: string) {
    const [messagesSent, totalUnread] = await Promise.all([
      this.messagesByUser(userId),
      ChatMessage.countDocuments({ receiver: userId, read: false, deleted: false })
    ]);

    return {
      userId,
      messagesSent,
      unreadMessages: totalUnread
    };
  }
}

export default new AnalyticsService();
