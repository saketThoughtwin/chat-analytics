import mongoose, { Schema } from 'mongoose';

export interface IRoom {
    _id: string; // Room ID (deterministic for direct, unique for group)
    type: 'direct' | 'group';
    participants: string[]; // Array of user IDs
    lastMessage?: {
        message: string;
        senderId: string;
        timestamp: Date;
        createdAt?: Date | string;
    };
    unreadCounts: Map<string, number>; // userId -> unread count
    createdAt: Date;
    updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
    {
        _id: { type: String, required: true },
        type: {
            type: String,
            enum: ['direct', 'group'],
            required: true,
            index: true
        },
        participants: {
            type: [String],
            ref: 'User',
            required: true,
            index: true
        },
        lastMessage: {
            message: String,
            senderId: String,
            timestamp: Date
        },
        unreadCounts: {
            type: Map,
            of: Number,
            default: new Map()
        }
    },
    {
        timestamps: true,
        _id: false // We're using custom _id
    }
);

// Compound index for efficient user room queries
RoomSchema.index({ participants: 1, updatedAt: -1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
