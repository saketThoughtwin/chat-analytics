import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
    userId: string;
    mediaUrl: string;
    type: 'image' | 'video';
    views: { userId: string; viewedAt: Date }[]; // List of user IDs who viewed the story
    expiresAt: Date;
    createdAt: Date;
}

const StorySchema = new Schema<IStory>(
    {
        userId: { type: String, required: true, index: true },
        mediaUrl: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        views: [{
            userId: { type: String, required: true },
            viewedAt: { type: Date, default: Date.now }
        }],
        expiresAt: {
            type: Date,
            required: true,
            index: true,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        }
    },
    { timestamps: true }
);

// Index for automatic expiration if needed, but we'll also filter in queries
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// FAST fetching active stories
StorySchema.index({ expiresAt: 1, createdAt: -1 });

export default mongoose.model<IStory>('Story', StorySchema);
