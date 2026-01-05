import ChatMessage, { IChatMessage } from './chat.model';
import roomService from './room.service';
import { redis } from '@config/redis';

interface PaginationOptions {
    page: number;
    limit: number;
}

interface MessageData {
    sender: string;
    roomId: string;
    message: string;
    receiver?: string;
}

class MessageService {
    /**
     * Send a message to a room
     */
    async sendMessage(data: MessageData): Promise<IChatMessage> {
        const newMessage = await ChatMessage.create({
            sender: data.sender,
            receiver: data.receiver,
            roomId: data.roomId,
            message: data.message,
            read: false,
            deleted: false
        });

        // Update room's last message
        await roomService.updateRoomLastMessage(data.roomId, data.message, data.sender);

        // Increment unread count for other participants
        const room = await roomService.getRoomById(data.roomId);
        if (room) {
            for (const participantId of room.participants) {
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
            ChatMessage.find({ roomId, deleted: false })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ChatMessage.countDocuments({ roomId, deleted: false })
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
        const now = new Date();

        await ChatMessage.updateMany(
            {
                _id: { $in: messageIds },
                receiver: userId,
                read: false
            },
            {
                read: true,
                readAt: now
            }
        );
    }

    /**
     * Mark all messages in a room as read for a user
     */
    async markRoomAsRead(roomId: string, userId: string): Promise<void> {
        const now = new Date();

        await ChatMessage.updateMany(
            {
                roomId,
                receiver: userId,
                read: false
            },
            {
                read: true,
                readAt: now
            }
        );

        // Clear unread count in room
        await roomService.markRoomAsRead(roomId, userId);
    }

    /**
     * Get unread message count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return ChatMessage.countDocuments({
            receiver: userId,
            read: false,
            deleted: false
        });
    }

    /**
     * Get unread messages for a specific room
     */
    async getRoomUnreadMessages(roomId: string, userId: string): Promise<IChatMessage[]> {
        return ChatMessage.find({
            roomId,
            receiver: userId,
            read: false,
            deleted: false
        }).sort({ createdAt: 1 });
    }

    /**
     * Soft delete a message
     */
    async deleteMessage(messageId: string, userId: string): Promise<boolean> {
        const result = await ChatMessage.updateOne(
            {
                _id: messageId,
                sender: userId
            },
            {
                deleted: true
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Mark message as delivered
     */
    async markAsDelivered(messageId: string): Promise<void> {
        await ChatMessage.findByIdAndUpdate(messageId, {
            deliveredAt: new Date()
        });
    }

    /**
     * Get message count for a user (total messages sent)
     */
    async getUserMessageCount(userId: string): Promise<number> {
        // Try Redis cache first
        const cached = await redis.get(`user:messages:${userId}`);
        if (cached) return parseInt(cached);

        // Fallback to database count
        const count = await ChatMessage.countDocuments({
            sender: userId,
            deleted: false
        });

        // Cache the result
        await redis.set(`user:messages:${userId}`, count.toString());

        return count;
    }
}

export default new MessageService();
