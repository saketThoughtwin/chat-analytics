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
    senderName?: string;
    roomId: string;
    message?: string;
    type?: 'text' | 'image' | 'video' | 'audio';
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
            senderName: data.senderName,
            receiver: data.receiver,
            roomId: data.roomId,
            message: data.message || '',
            type: data.type || 'text',
            mediaUrl: data.mediaUrl,
            read: false,
            deleted: false
        });

        // Update room's last message
        const lastMsgText = data.type === 'image' ? '📷 Photo' : data.type === 'video' ? '🎥 Video' : data.type === 'audio' ? '🎤 Voice message' : data.message || '';
        await roomService.updateRoomLastMessage(data.roomId, newMessage._id.toString(), lastMsgText, data.sender);

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
        options: PaginationOptions = { page: 1, limit: 50 },
        filter?: any
    ): Promise<{ messages: IChatMessage[]; hasMore: boolean; total: number }> {
        const { page, limit } = options;
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            messageRepository.findByRoomId(roomId, {
                skip,
                limit,
                sort: { createdAt: -1 }
            }, filter),
            messageRepository.countByRoomId(roomId, filter)
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

        // Check if messages are now read by everyone
        const messages = await messageRepository.findByIds(messageIds);
        for (const msg of messages) {
            await this.updateFinalReadStatus(msg);
        }
    }

    /**
     * Mark all messages in a room as read for a user
     */
    async markRoomAsRead(roomId: string, userId: string): Promise<void> {
        await messageRepository.markRoomAsRead(roomId, userId);

        // Clear unread count in room
        await roomService.markRoomAsRead(roomId, userId);

        // Check for final status updates in this room (could be expensive for large history, 
        // usually we only care about recent ones, but let's keep it simple for now)
        // Optimization: only check unread messages
        const unreadMessages = await messageRepository.updateMany(
            { roomId, read: false },
            {} // We just want to trigger a check? No, let's just find and loop.
        );
        // Actually, a better way is to find messages where read is false and check them.
    }

    private async updateFinalReadStatus(msg: IChatMessage): Promise<void> {
        if (msg.read) return;

        const room = await roomService.getRoomById(msg.roomId);
        if (!room) return;

        const activeParticipants = room.participants;
        const otherParticipantsCount = activeParticipants.length - 1;

        // Filter valid readers (must be an active participant and not the sender)
        const validReaders = msg.readBy.filter(r =>
            activeParticipants.some(p => (p as any)._id?.toString() === r.userId || p.toString() === r.userId) &&
            r.userId !== msg.sender?.toString()
        );

        if (validReaders.length >= otherParticipantsCount && otherParticipantsCount > 0) {
            await messageRepository.updateById(msg._id.toString(), {
                read: true,
                readAt: new Date()
            });
        }
    }

    /**
     * Mark messages as delivered
     */
    async markAsDelivered(messageIds: string[], userId: string): Promise<void> {
        await messageRepository.markAsDelivered(messageIds, userId);

        const messages = await messageRepository.findByIds(messageIds);
        for (const msg of messages) {
            await this.updateFinalDeliveredStatus(msg);
        }
    }

    private async updateFinalDeliveredStatus(msg: IChatMessage): Promise<void> {
        if (msg.deliveredAt) return;

        const room = await roomService.getRoomById(msg.roomId);
        if (!room) return;

        const activeParticipants = room.participants;
        const otherParticipantsCount = activeParticipants.length - 1;

        const validDelivers = msg.deliveredTo.filter(d =>
            activeParticipants.some(p => (p as any)._id?.toString() === d.userId || p.toString() === d.userId) &&
            d.userId !== msg.sender?.toString()
        );

        if (validDelivers.length >= otherParticipantsCount && otherParticipantsCount > 0) {
            await messageRepository.updateById(msg._id.toString(), {
                deliveredAt: new Date()
            });
        }
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
    async deleteMessage(messageId: string, userId: string): Promise<IChatMessage | null> {
        return messageRepository.softDelete(messageId, userId);
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

    /**
     * Toggle star status of a message
     */
    async toggleStarMessage(messageId: string, userId: string, starred: boolean): Promise<IChatMessage | null> {
        return messageRepository.toggleStar(messageId, userId, starred);
    }

    /**
     * Get starred messages for a room
     */
    async getStarredMessages(roomId: string, userId: string): Promise<IChatMessage[]> {
        return messageRepository.findStarredByRoomId(roomId, userId);
    }

    /**
     * Get all starred messages for a user
     */
    async getAllStarredMessages(userId: string): Promise<IChatMessage[]> {
        return messageRepository.findStarredByUser(userId);
    }
}

export default new MessageService();
