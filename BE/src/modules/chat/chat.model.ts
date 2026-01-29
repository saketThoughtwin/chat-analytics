import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  sender: string;
  receiver?: string; // For backward compatibility, but roomId is now primary
  roomId: string; // Now required - all messages belong to a room
  message: string;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
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
    message: { type: String, required: false },
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    mediaUrl: { type: String },
    read: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    deleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// FAST room message pagination
ChatSchema.index({ roomId: 1, deleted: 1, createdAt: -1 });

// FAST unread counters (Redis fallback)
ChatSchema.index({ receiver: 1, read: 1, deleted: 1 });

// FAST mark room as read
ChatSchema.index({ roomId: 1, receiver: 1, read: 1 });

// FAST user analytics
ChatSchema.index({ sender: 1, deleted: 1 });

// FAST cleanup / archive jobs
ChatSchema.index({ deleted: 1, createdAt: -1 });


export default mongoose.model<IChatMessage>('ChatMessage', ChatSchema);
