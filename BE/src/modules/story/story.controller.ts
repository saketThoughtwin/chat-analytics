import { Request, Response } from "express";
import StoryService from "./story.service";

class StoryController {
    async createStory(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ message: "No file uploaded" });
            }

            const mediaUrl = file.path; // Cloudinary URL
            const isVideo = file.mimetype.startsWith('video');
            const type = isVideo ? 'video' : 'image';

            const story = await StoryService.createStory(userId, mediaUrl, type);
            return res.status(201).json(story);
        } catch (error: any) {
            console.error("Error creating story:", error);
            return res.status(500).json({ message: error.message });
        }
    }

    async getActiveStories(req: Request, res: Response) {
        try {
            const groupedStories = await StoryService.getActiveStoriesGrouped();
            return res.status(200).json(groupedStories);
        } catch (error: any) {
            console.error("Error fetching stories:", error);
            return res.status(500).json({ message: error.message });
        }
    }

    async viewStory(req: Request, res: Response) {
        try {
            const userId = (req as any).user.id;
            const { storyId } = req.params;

            await StoryService.viewStory(storyId, userId);
            return res.status(200).json({ message: "Story viewed" });
        } catch (error: any) {
            console.error("Error viewing story:", error);
            return res.status(500).json({ message: error.message });
        }
    }

    async getStoryViewers(req: Request, res: Response) {
        try {
            const { storyId } = req.params;
            const viewers = await StoryService.getStoryViewers(storyId);
            return res.status(200).json(viewers);
        } catch (error: any) {
            console.error("Error fetching story viewers:", error);
            return res.status(500).json({ message: error.message });
        }
    }
}

export default new StoryController();
