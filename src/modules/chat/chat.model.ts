import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  sender: string;
  receiver?: string; // For backward compatibility, but roomId is now primary
  roomId: string; // Now required - all messages belong to a room
  message: string;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  read: boolean;
  deleted: boolean;
}

const ChatSchema = new Schema<IChatMessage>(
  {
    sender: { type: String, required: true, index: true },
    receiver: { type: String }, // Optional for backward compatibility
    roomId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    deleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound indexes for efficient pagination and queries
ChatSchema.index({ roomId: 1, createdAt: -1 }); // For paginated message retrieval
ChatSchema.index({ sender: 1, createdAt: -1 }); // For user message analytics
ChatSchema.index({ roomId: 1, read: 1, receiver: 1 }); // For unread message queries

export default mongoose.model<IChatMessage>('ChatMessage', ChatSchema);
