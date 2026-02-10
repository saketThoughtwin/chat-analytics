import Story, { IStory } from "./story.model";
import User from "../users/user.model";

class StoryRepository {
    async create(story: Partial<IStory>) {
        return Story.create(story);
    }

    async findActiveStories() {
        const now = new Date();
        return Story.find({ expiresAt: { $gt: now } })
            .sort({ createdAt: -1 })
            .lean();
    }

    async findByUserId(userId: string) {
        const now = new Date();
        return Story.find({ userId, expiresAt: { $gt: now } })
            .sort({ createdAt: -1 })
            .lean();
    }

    async findById(id: string) {
        return Story.findById(id).lean();
    }

    async addView(storyId: string, userId: string) {
        // Prevent duplicate views from the same user
        const story = await Story.findById(storyId);
        if (!story) return { story: null, isNewView: false };

        const alreadyViewed = story.views.some(v => {
            const vId = typeof v === 'string' ? v : v.userId;
            return vId.toString() === userId.toString();
        });

        if (alreadyViewed) return { story, isNewView: false };

        const updatedStory = await Story.findByIdAndUpdate(
            storyId,
            { $push: { views: { userId, viewedAt: new Date() } } },
            { new: true }
        );

        return { story: updatedStory, isNewView: true };
    }

    async getStoryViewers(storyId: string) {
        const story = await Story.findById(storyId).lean();
        if (!story || !story.views.length) return [];

        // Unique the views by userId, keeping only the first (earliest) view
        const uniqueViews: any[] = [];
        const seenUserIds = new Set();

        for (const view of story.views) {
            const userId = (typeof view === 'string' ? view : view.userId).toString();
            if (!seenUserIds.has(userId)) {
                seenUserIds.add(userId);
                uniqueViews.push(view);
            }
        }

        const userIds = uniqueViews.map(v => typeof v === 'string' ? v : v.userId);
        const users = await User.find({ _id: { $in: userIds } })
            .select('name avatar email')
            .lean();

        // Merge user details with viewedAt time
        return uniqueViews.map(v => {
            const vId = (typeof v === 'string' ? v : v.userId).toString();
            const viewedAt = typeof v === 'string' ? story.createdAt : v.viewedAt;
            const user = users.find(u => u._id.toString() === vId);
            if (!user) return null;
            return {
                ...user,
                viewedAt
            };
        }).filter(v => v !== null);
    }
}

export default new StoryRepository();
