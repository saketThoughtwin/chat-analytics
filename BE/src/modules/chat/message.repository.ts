import ChatMessage, { IChatMessage } from "./chat.model";

class MessageRepository {
    async create(message: Partial<IChatMessage>) {
        return ChatMessage.create(message);
    }

    async findById(id: string) {
        return ChatMessage.findById(id).lean();
    }

    async findByRoomId(roomId: string, options?: { skip?: number; limit?: number; sort?: any }) {
        return ChatMessage.find({ roomId, deleted: false })
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
                receiver: receiverId,
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
                receiver: receiverId,
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
            { deleted: true }
        );
    }

    async deleteById(id: string) {
        return ChatMessage.findByIdAndDelete(id);
    }

    async deleteByRoomId(roomId: string) {
        return ChatMessage.deleteMany({ roomId });
    }
}

export default new MessageRepository();
