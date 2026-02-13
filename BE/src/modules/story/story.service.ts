import StoryRepository from "./story.repository";
import User from "../users/user.model";

class StoryService {
    async createStory(userId: string, mediaUrl: string, type: 'image' | 'video') {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return StoryRepository.create({
            userId,
            mediaUrl,
            type,
            expiresAt,
            views: []
        });
    }

    async getActiveStoriesGrouped() {
        const stories = await StoryRepository.findActiveStories();

        // Group by userId and fetch user info
        const userIds = [...new Set(stories.map(s => s.userId))];
        const users = await User.find({ _id: { $in: userIds } }).select('name avatar email').lean();

        const grouped = userIds.map(userId => {
            const user = users.find((u: any) => u._id.toString() === userId.toString());
            const userStories = stories.filter(s => s.userId === userId);
            return {
                user,
                stories: userStories
            };
        });

        return grouped;
    }

    async viewStory(storyId: string, viewerId: string) {
        return StoryRepository.addView(storyId, viewerId);
    }

    async getStoryViewers(storyId: string) {
        return StoryRepository.getStoryViewers(storyId);
    }

    async deleteStory(storyId: string, userId: string) {
        return StoryRepository.delete(storyId, userId);
    }
}

export default new StoryService();
