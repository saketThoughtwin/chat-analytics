import Room, { IRoom } from './room.model';
import { RoomIdGenerator } from '@utils/roomIdGenerator';
import { redis } from '@config/redis';

class RoomService {
    /**
     * Get or create a direct chat room between two users
     * Always returns the same room for the same pair of users
     */
    async getOrCreateDirectRoom(userId1: string, userId2: string): Promise<IRoom> {
        const roomId = RoomIdGenerator.generateDirectRoomId(userId1, userId2);

        let room = await Room.findById(roomId);

        if (!room) {
            room = await Room.create({
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
        return Room.findById(roomId);
    }

    /**
     * Get all rooms for a user, sorted by last activity
     */
    async getUserRooms(userId: string, page: number = 1, limit: number = 20): Promise<IRoom[]> {
        const skip = (page - 1) * limit;

        return Room.find({ participants: userId })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit);
    }

    /**
     * Update room's last message metadata
     */
    async updateRoomLastMessage(roomId: string, message: string, senderId: string): Promise<void> {
        await Room.findByIdAndUpdate(roomId, {
            lastMessage: {
                text: message,
                senderId,
                timestamp: new Date()
            },
            updatedAt: new Date()
        });
    }

    /**
     * Increment unread count for a user in a room
     */
    async incrementUnreadCount(roomId: string, userId: string): Promise<void> {
        const room = await Room.findById(roomId);
        if (!room) return;

        const currentCount = room.unreadCounts.get(userId) || 0;
        room.unreadCounts.set(userId, currentCount + 1);
        await room.save();

        // Also cache in Redis for quick access
        await redis.incr(`unread:${userId}:${roomId}`);
    }

    /**
     * Mark room as read for a user (clear unread count)
     */
    async markRoomAsRead(roomId: string, userId: string): Promise<void> {
        const room = await Room.findById(roomId);
        if (!room) return;

        room.unreadCounts.set(userId, 0);
        await room.save();

        // Clear Redis cache
        await redis.del(`unread:${userId}:${roomId}`);
    }

    /**
     * Get total unread count for a user across all rooms
     */
    async getTotalUnreadCount(userId: string): Promise<number> {
        const rooms = await Room.find({ participants: userId });
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
        const room = await Room.findById(roomId);
        return room?.unreadCounts.get(userId) || 0;
    }

    /**
     * Create a group room
     */
    async createGroupRoom(participants: string[]): Promise<IRoom> {
        const roomId = RoomIdGenerator.generateGroupRoomId(participants);

        const room = await Room.create({
            _id: roomId,
            type: 'group',
            participants,
            unreadCounts: new Map()
        });

        return room;
    }
}

export default new RoomService();
