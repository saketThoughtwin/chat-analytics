import ChatMessage, { IChatMessage } from "./chat.model";

class MessageRepository {
    async create(message: Partial<IChatMessage>) {
        return ChatMessage.create(message);
    }

    async findById(id: string) {
        return ChatMessage.findById(id).lean();
    }

    async findByIds(ids: string[]) {
        return ChatMessage.find({ _id: { $in: ids } }).lean();
    }

    async findByRoomId(roomId: string, options?: { skip?: number; limit?: number; sort?: any }, filter?: any) {
        const query = { roomId, ...(filter || {}) };

        return ChatMessage.find(query)
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

    async countByRoomId(roomId: string, filter?: any) {
        const query = { roomId, deleted: false, ...(filter || {}) };
        return ChatMessage.countDocuments(query);
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

    async markAsRead(messageIds: string[], userId: string) {
        return ChatMessage.updateMany(
            {
                _id: { $in: messageIds },
                sender: { $ne: userId }
            },
            {
                $addToSet: { readBy: { userId, at: new Date() } }
            }
        );
    }


    async markRoomAsRead(roomId: string, userId: string) {
        return ChatMessage.updateMany(
            {
                roomId,
                sender: { $ne: userId }
            },
            {
                $addToSet: { readBy: { userId, at: new Date() } }
            }
        );
    }

    async markAsDelivered(messageIds: string[], userId: string) {
        return ChatMessage.updateMany(
            {
                _id: { $in: messageIds },
                sender: { $ne: userId }
            },
            {
                $addToSet: { deliveredTo: { userId, at: new Date() } }
            }
        );
    }

    async markRoomAsDelivered(roomId: string, userId: string) {
        return ChatMessage.updateMany(
            {
                roomId,
                sender: { $ne: userId }
            },
            {
                $addToSet: { deliveredTo: { userId, at: new Date() } }
            }
        );
    }


    async softDelete(id: string, senderId: string) {
        return ChatMessage.findOneAndUpdate(
            { _id: id, sender: senderId },
            { deleted: true, message: "This message was deleted", type: 'text', mediaUrl: null },
            { new: true }
        );
    }

    async toggleStar(id: string, userId: string, starred: boolean) {
        const update = starred
            ? { $addToSet: { starredBy: userId } }
            : { $pull: { starredBy: userId } };
        return ChatMessage.findByIdAndUpdate(id, update, { new: true });
    }

    async findStarredByRoomId(roomId: string, userId: string) {
        return ChatMessage.find({ roomId, starredBy: userId, deleted: false }).lean();
    }

    async findStarredByUser(userId: string) {
        return ChatMessage.find({
            starredBy: userId,
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
