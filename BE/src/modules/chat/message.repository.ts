import ChatMessage, { IChatMessage } from "./chat.model";

class MessageRepository {
    async create(message: Partial<IChatMessage>) {
        return ChatMessage.create(message);
    }

    async findById(id: string) {
        return ChatMessage.findById(id).lean();
    }

    async findByRoomId(roomId: string, options?: { skip?: number; limit?: number; sort?: any }) {
        return ChatMessage.find({ roomId })
            .sort(options?.sort || { createdAt: -1 })
            .skip(options?.skip || 0)
            .limit(options?.limit || 50)
            .lean()
            .exec();
    }

    async findBySender(senderId: string, options?: { skip?: number; limit?: number }) {
        return ChatMessage.find({ sender: senderId, deleted: false })
            .skip(options?.skip || 0)
            .limit(options?.limit || 50)
            .lean()                // ✅
            .exec();
    }

    async findUnreadByReceiver(receiverId: string) {
        return ChatMessage.find({ receiver: receiverId, read: false, deleted: false }).lean();
    }

    async countByRoomId(roomId: string) {
        return ChatMessage.countDocuments({ roomId, deleted: false });
    }

    async countBySender(senderId: string) {
        return ChatMessage.countDocuments({ sender: senderId, deleted: false });
    }

    async countUnreadByReceiver(receiverId: string) {
        return ChatMessage.countDocuments({ receiver: receiverId, read: false, deleted: false });
    }

    async countAll() {
        return ChatMessage.countDocuments({ deleted: false });
    }

    async updateById(id: string, update: Partial<IChatMessage>) {
        return ChatMessage.findByIdAndUpdate(id, update, { new: true });
    }

    async updateMany(filter: any, update: any) {
        return ChatMessage.updateMany(filter, update);
    }

    async markAsRead(messageIds: string[], receiverId: string) {
        return ChatMessage.updateMany(
            {
                _id: { $in: messageIds },
                sender: { $ne: receiverId },
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );
    }

    async markRoomAsRead(roomId: string, receiverId: string) {
        return ChatMessage.updateMany(
            {
                roomId,
                sender: { $ne: receiverId },
                read: false
            },
            {
                read: true,
                readAt: new Date()
            }
        );
    }

    async softDelete(id: string, senderId: string) {
        return ChatMessage.updateOne(
            { _id: id, sender: senderId },
            { deleted: true, message: "This message was deleted", type: 'text', mediaUrl: null }
        );
    }

    async toggleStar(id: string, starred: boolean) {
        return ChatMessage.findByIdAndUpdate(id, { starred }, { new: true });
    }

    async findStarredByRoomId(roomId: string) {
        return ChatMessage.find({ roomId, starred: true, deleted: false }).lean();
    }

    async findStarredByUser(userId: string) {
        // Find messages where user is sender OR receiver (or just part of the room?)
        // Actually, if starred is global, we just find all starred messages in rooms the user is part of.
        // But for simplicity, let's just find all starred messages where the user is sender or receiver.
        // Or better, find all messages that are starred.
        // Wait, if I star a message in a group, everyone sees it.
        // So I should find all starred messages in rooms the user belongs to.
        // This is complex.
        // Let's just stick to "findStarredByRoomId" and maybe the UI only enables it when a room is active?
        // But the user put the button in the global sidebar.
        // Let's try to implement `findStarredByUser` which finds messages sent by or received by user that are starred.
        return ChatMessage.find({
            $or: [{ sender: userId }, { receiver: userId }],
            starred: true,
            deleted: false
        }).lean();
    }

    async deleteById(id: string) {
        return ChatMessage.findByIdAndDelete(id);
    }

    async deleteByRoomId(roomId: string) {
        return ChatMessage.deleteMany({ roomId });
    }
}

export default new MessageRepository();
