import ChatMessage, { IChatMessage } from "./chat.model";

class MessageRepository {
    async create(message: Partial<IChatMessage>) {
        return ChatMessage.create(message);
    }

    async findById(id: string) {
        return ChatMessage.findById(id);
    }

    async findByRoomId(roomId: string, options?: { skip?: number; limit?: number; sort?: any }) {
        const query = ChatMessage.find({ roomId, deleted: false });

        if (options?.sort) {
            query.sort(options.sort);
        }
        if (options?.skip) {
            query.skip(options.skip);
        }
        if (options?.limit) {
            query.limit(options.limit);
        }

        return query.exec();
    }

    async findBySender(senderId: string, options?: { skip?: number; limit?: number }) {
        const query = ChatMessage.find({ sender: senderId, deleted: false });

        if (options?.skip) {
            query.skip(options.skip);
        }
        if (options?.limit) {
            query.limit(options.limit);
        }

        return query.exec();
    }

    async findUnreadByReceiver(receiverId: string) {
        return ChatMessage.find({ receiver: receiverId, read: false, deleted: false });
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
}

export default new MessageRepository();
