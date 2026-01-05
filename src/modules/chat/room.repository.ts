import Room, { IRoom } from "./room.model";

class RoomRepository {
    async create(room: Partial<IRoom>) {
        return Room.create(room);
    }

    async findById(id: string) {
        return Room.findById(id);
    }

    async findByParticipant(userId: string, options?: { skip?: number; limit?: number }) {
        const query = Room.find({ participants: userId }).sort({ updatedAt: -1 });

        if (options?.skip) {
            query.skip(options.skip);
        }
        if (options?.limit) {
            query.limit(options.limit);
        }

        return query.exec();
    }

    async findByParticipants(participants: string[]) {
        return Room.find({ participants: { $all: participants } });
    }

    async findDirectRoom(userId1: string, userId2: string) {
        return Room.findOne({
            type: 'direct',
            participants: { $all: [userId1, userId2] }
        });
    }

    async updateById(id: string, update: Partial<IRoom>) {
        return Room.findByIdAndUpdate(id, update, { new: true });
    }

    async updateLastMessage(roomId: string, message: string, senderId: string) {
        return Room.findByIdAndUpdate(
            roomId,
            {
                lastMessage: {
                    text: message,
                    senderId,
                    timestamp: new Date()
                },
                updatedAt: new Date()
            },
            { new: true }
        );
    }

    async incrementUnreadCount(roomId: string, userId: string) {
        const room = await Room.findById(roomId);
        if (!room) return null;

        const currentCount = room.unreadCounts.get(userId) || 0;
        room.unreadCounts.set(userId, currentCount + 1);
        return room.save();
    }

    async clearUnreadCount(roomId: string, userId: string) {
        const room = await Room.findById(roomId);
        if (!room) return null;

        room.unreadCounts.set(userId, 0);
        return room.save();
    }

    async getUnreadCount(roomId: string, userId: string) {
        const room = await Room.findById(roomId);
        return room?.unreadCounts.get(userId) || 0;
    }

    async countByParticipant(userId: string) {
        return Room.countDocuments({ participants: userId });
    }

    async deleteById(id: string) {
        return Room.findByIdAndDelete(id);
    }
}

export default new RoomRepository();
