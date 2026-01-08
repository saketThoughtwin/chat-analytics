import messageRepository from '@modules/chat/message.repository';
import userRepository from '@modules/users/user.repository';
import { redis } from "@config/redis";

class AnalyticsService {

  async totalUsers() {
    try {
      return await userRepository.count();
    } catch {
      return 0;
    }
  }

  async onlineUsers() {
    try {
      return await redis.scard('online_users');
    } catch {
      return 0;
    }
  }

  async totalMessages() {
    try {
      return await messageRepository.countAll();
    } catch {
      return 0;
    }
  }

  async messagesByUser(userId: string) {
    try {
      const cacheKey = `user:messages:${userId}`;

      const cached = await redis.get(cacheKey);
      if (cached) return Number(cached);

      const count = await messageRepository.countBySender(userId);

      await redis.setex(cacheKey, 300, count.toString()); // 5 min TTL
      return count;
    } catch {
      return messageRepository.countBySender(userId);
    }
  }

  async activeUsersPerChat(roomId: string) {
    try {
      return await redis.scard(`chat:active:${roomId}`);
    } catch {
      return 0;
    }
  }

  async roomStats(roomId: string) {
    try {
      const [totalMessages, activeUsers] = await Promise.all([
        messageRepository.countByRoomId(roomId),
        redis.scard(`chat:active:${roomId}`)
      ]);

      return { roomId, totalMessages, activeUsers };
    } catch {
      return { roomId, totalMessages: 0, activeUsers: 0 };
    }
  }

  async userChatStats(userId: string) {
    try {
      const [messagesSent, totalUnread] = await Promise.all([
        this.messagesByUser(userId),
        messageRepository.countUnreadByReceiver(userId)
      ]);

      return { userId, messagesSent, unreadMessages: totalUnread };
    } catch {
      return { userId, messagesSent: 0, unreadMessages: 0 };
    }
  }
}

export default new AnalyticsService();
