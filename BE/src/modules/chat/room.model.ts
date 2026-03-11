import mongoose, { Schema } from 'mongoose';

export interface IRoom {
    _id: string; // Room ID (deterministic for direct, unique for group)
    type: 'direct' | 'group';
    name?: string; // Group name
    avatar?: string; // Group profile picture URL
    groupAdmin?: string; // User ID who created the group
    participants: string[]; // Array of user IDs
    leftParticipants?: string[]; // Array of user IDs who left but have history
    leftAtBy?: Map<string, Date>; // userId -> leftAt (used to hide future messages)
    lastMessage?: {

        messageId: string;
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
        name: { type: String },
        avatar: { type: String, default: "" },
        groupAdmin: { type: String, ref: 'User' },
        participants: {
            type: [String],
            ref: 'User',
            required: true,
            index: true
        },
        leftParticipants: {
            type: [String],
            ref: 'User',
            default: []
        },
        leftAtBy: {
            type: Map,
            of: Date,
            default: new Map()
        },

        lastMessage: {
            messageId: String,
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
