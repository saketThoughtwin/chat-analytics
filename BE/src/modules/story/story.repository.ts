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
        return Story.findByIdAndUpdate(
            storyId,
            { $addToSet: { views: userId } },
            { new: true }
        );
    }

    async getStoryViewers(storyId: string) {
        const story = await Story.findById(storyId).select('views').lean();
        if (!story || !story.views.length) return [];

        // Fetch viewer details (name, avatar)
        const User = (await import("../users/user.model")).default;
        return User.find({ _id: { $in: story.views } })
            .select('name avatar email')
            .lean();
    }
}

export default new StoryRepository();
