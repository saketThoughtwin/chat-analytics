import { IChatMessage } from './chat.model';
import messageRepository from './message.repository';
import roomService from './room.service';
import { redis } from '@config/redis';

interface PaginationOptions {
    page: number;
    limit: number;
}

interface MessageData {
    sender: string;
    roomId: string;
    message?: string;
    type?: 'text' | 'image' | 'video';
    mediaUrl?: string;
    receiver?: string;
}

class MessageService {
    /**
     * Send a message to a room
     */
    async sendMessage(data: MessageData): Promise<IChatMessage> {
        const newMessage = await messageRepository.create({
            sender: data.sender,
            receiver: data.receiver,
            roomId: data.roomId,
            message: data.message || '',
            type: data.type || 'text',
            mediaUrl: data.mediaUrl,
            read: false,
            deleted: false
        });

        // Update room's last message
        const lastMsgText = data.type === 'image' ? '📷 Photo' : data.type === 'video' ? '🎥 Video' : data.message || '';
        await roomService.updateRoomLastMessage(data.roomId, lastMsgText, data.sender);

        // Increment unread count for other participants
        const room = await roomService.getRoomById(data.roomId);
        if (room) {
            for (const participant of room.participants) {
                const participantId = (participant as any)._id ? (participant as any)._id.toString() : participant.toString();
                if (participantId !== data.sender) {
                    await roomService.incrementUnreadCount(data.roomId, participantId);
                }
            }
        }

        // Increment sender's message count in Redis
        await redis.incr(`user:messages:${data.sender}`);

        return newMessage;
    }

    /**
     * Get messages for a room with pagination
     * Returns messages in reverse chronological order (newest first)
     */
    async getMessages(
        roomId: string,
        options: PaginationOptions = { page: 1, limit: 50 }
    ): Promise<{ messages: IChatMessage[]; hasMore: boolean; total: number }> {
        const { page, limit } = options;
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            messageRepository.findByRoomId(roomId, {
                skip,
                limit,
                sort: { createdAt: -1 }
            }),
            messageRepository.countByRoomId(roomId)
        ]);

        const hasMore = skip + messages.length < total;

        return {
            messages: messages.reverse(), // Reverse to show oldest first in the page
            hasMore,
            total
        };
    }

    /**
     * Mark messages as read
     */
    async markAsRead(messageIds: string[], userId: string): Promise<void> {
        await messageRepository.markAsRead(messageIds, userId);
    }

    /**
     * Mark all messages in a room as read for a user
     */
    async markRoomAsRead(roomId: string, userId: string): Promise<void> {
        await messageRepository.markRoomAsRead(roomId, userId);

        // Clear unread count in room
        await roomService.markRoomAsRead(roomId, userId);
    }

    /**
     * Get unread message count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return messageRepository.countUnreadByReceiver(userId);
    }

    /**
     * Get unread messages for a specific room
     */
    async getRoomUnreadMessages(roomId: string, userId: string): Promise<IChatMessage[]> {
        return messageRepository.findUnreadByReceiver(userId);
    }

    /**
     * Soft delete a message
     */
    async deleteMessage(messageId: string, userId: string): Promise<boolean> {
        const result = await messageRepository.softDelete(messageId, userId);
        return result.modifiedCount > 0;
    }

    /**
     * Mark message as delivered
     */
    async markAsDelivered(messageId: string): Promise<void> {
        await messageRepository.updateById(messageId, {
            deliveredAt: new Date()
        });
    }

    /**
     * Check if a user is currently online
     */
    async isUserOnline(userId: string): Promise<boolean> {
        const status = await redis.get(`last_seen:${userId}`);
        return status === "online";
    }

    /**
     * Get message count for a user (total messages sent)
     */
    async getUserMessageCount(userId: string): Promise<number> {
        // Try Redis cache first
        const cached = await redis.get(`user:messages:${userId}`);
        if (cached) return parseInt(cached);

        // Fallback to database count
        const count = await messageRepository.countBySender(userId);

        // Cache the result
        await redis.set(`user:messages:${userId}`, count.toString());

        return count;
    }

    /**
     * Delete all messages in a room
     */
    async deleteMessagesByRoomId(roomId: string): Promise<void> {
        await messageRepository.deleteByRoomId(roomId);
    }
}

export default new MessageService();
