import { IRoom } from './room.model';
import roomRepository from './room.repository';
import { RoomIdGenerator } from '@utils/roomIdGenerator';
import { redis } from '@config/redis';

class RoomService {
    /**
     * Get or create a direct chat room between two users
     * Always returns the same room for the same pair of users
     */
    async getOrCreateDirectRoom(userId1: string, userId2: string): Promise<IRoom> {
        const roomId = RoomIdGenerator.generateDirectRoomId(userId1, userId2);

        let room = await roomRepository.findById(roomId);

        if (!room) {
            room = await roomRepository.create({
                _id: roomId,
                type: 'direct',
                participants: [userId1, userId2],
                unreadCounts: new Map()
            });
        }

        return room;
    }

    /**
     * Get room by ID
     */
    async getRoomById(roomId: string): Promise<IRoom | null> {
        return roomRepository.findById(roomId);
    }

    /**
     * Get all rooms for a user, sorted by last activity
     */
    async getUserRooms(userId: string, page: number = 1, limit: number = 20): Promise<IRoom[]> {
        const skip = (page - 1) * limit;
        return roomRepository.findByParticipant(userId, { skip, limit });
    }

    /**
     * Update room's last message metadata
     */
    async updateRoomLastMessage(roomId: string, messageId: string, message: string, senderId: string): Promise<void> {
        // Use a placeholder for voice messages in the room list to keep it lightweight
        const displayMessage = message.startsWith('data:audio/')
            ? '🎤 Voice message'
            : message;

        await roomRepository.updateLastMessage(roomId, messageId, displayMessage, senderId);
    }

    /**
     * Increment unread count for a user in a room
     */
    async incrementUnreadCount(roomId: string, userId: string): Promise<void> {
        await roomRepository.incrementUnreadCount(roomId, userId);

        // Also cache in Redis for quick access
        await redis.incr(`unread:${userId}:${roomId}`);
    }

    /**
     * Mark room as read for a user (clear unread count)
     */
    async markRoomAsRead(roomId: string, userId: string): Promise<void> {
        await roomRepository.clearUnreadCount(roomId, userId);

        // Clear Redis cache
        await redis.del(`unread:${userId}:${roomId}`);
    }

    /**
     * Get total unread count for a user across all rooms
     */
    async getTotalUnreadCount(userId: string): Promise<number> {
        const rooms = await roomRepository.findByParticipant(userId);
        let total = 0;

        for (const room of rooms) {
            total += room.unreadCounts.get(userId) || 0;
        }

        return total;
    }

    /**
     * Get unread count for a specific room
     */
    async getRoomUnreadCount(roomId: string, userId: string): Promise<number> {
        // Try Redis cache first
        const cached = await redis.get(`unread:${userId}:${roomId}`);
        if (cached) return parseInt(cached);

        // Fallback to database
        return roomRepository.getUnreadCount(roomId, userId);
    }

    /**
     * Create a group room
     */
    async createGroupRoom(participants: string[], name: string, creatorId: string): Promise<IRoom> {
        const roomId = RoomIdGenerator.generateGroupRoomId(participants);

        const room = await roomRepository.create({
            _id: roomId,
            type: 'group',
            name,
            groupAdmin: creatorId,
            participants,
            unreadCounts: new Map()
        });

        return room;
    }

    /**
     * Update a group room (name, participants, etc.)
     */
    async updateRoom(roomId: string, data: Partial<IRoom>): Promise<IRoom | null> {
        return roomRepository.updateById(roomId, data);
    }

    /**
     * Hide/clear a room for a single user (they stay in the group).
     * Room reappears when new messages arrive (via lastMessage timestamp).
     */
    async hideRoomForUser(roomId: string, userId: string): Promise<IRoom | null> {
        const room = await roomRepository.findById(roomId);
        if (!room) return null;

        const rawHiddenBy = (room as any).hiddenBy;
        const hiddenByObj: Record<string, any> =
            rawHiddenBy instanceof Map
                ? Object.fromEntries(rawHiddenBy.entries())
                : (rawHiddenBy || {});
        hiddenByObj[userId] = new Date();

        // Clear unread count for this user so hidden rooms don't keep stale badges.
        await this.markRoomAsRead(roomId, userId);

        return roomRepository.updateById(roomId, { hiddenBy: hiddenByObj as any } as any);
    }

    async leaveGroup(roomId: string, userId: string): Promise<IRoom | null> {
        const room = await roomRepository.findById(roomId);
        if (!room) return null;

        // Move from participants to leftParticipants
        const updatedParticipants = room.participants.filter(p => (typeof p === 'object' ? (p as any)._id : p).toString() !== userId);
        const existingLeft = (room.leftParticipants || [])
            .map((p: any) => ((p as any)?._id || p)?.toString?.())
            .filter((id: any) => Boolean(id) && id !== "[object Object]");
        const updatedLeftParticipants = Array.from(new Set([...existingLeft, userId]));

        // Track when the user left so we can hide future messages for them.
        const rawLeftAtBy = (room as any).leftAtBy;
        const leftAtByObj: Record<string, any> =
            rawLeftAtBy instanceof Map
                ? Object.fromEntries(rawLeftAtBy.entries())
                : (rawLeftAtBy || {});
        leftAtByObj[userId] = new Date();

        // Remove from unreadCounts
        if (room.unreadCounts instanceof Map) {
            room.unreadCounts.delete(userId);
        } else if (typeof room.unreadCounts === 'object') {
            delete (room.unreadCounts as any)[userId];
        }

        // If leaver was admin, do not auto-assign a new admin.
        // Group can exist without an admin.
        let updatedAdmin = room.groupAdmin;
        if (room.groupAdmin?.toString() === userId) {
            updatedAdmin = "";
        }

        return roomRepository.updateById(roomId, {
            participants: updatedParticipants,
            leftParticipants: updatedLeftParticipants,
            leftAtBy: leftAtByObj as any,
            unreadCounts: room.unreadCounts,
            groupAdmin: updatedAdmin
        });

    }

    /**
     * Delete a room
     */
    async deleteRoom(roomId: string): Promise<void> {
        await roomRepository.deleteById(roomId);
    }

    /**
     * Refresh room's last message from database
     */
    async refreshRoomLastMessage(roomId: string): Promise<void> {
        const lastMsg = await roomRepository.findLastMessage(roomId);
        if (lastMsg) {
            const displayMessage = (lastMsg as any).type === 'image' ? '📷 Photo' : (lastMsg as any).type === 'video' ? '🎥 Video' : (lastMsg as any).type === 'audio' ? '🎤 Voice message' : (lastMsg as any).message || '';
            await roomRepository.updateLastMessage(roomId, (lastMsg as any)._id.toString(), displayMessage, (lastMsg as any).sender);
        } else {
            // No messages left in room
            await roomRepository.updateById(roomId, { lastMessage: undefined });
        }
    }
}

export default new RoomService();
