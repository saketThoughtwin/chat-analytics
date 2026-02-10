import { Router } from "express";
import StoryController from "../modules/story/story.controller";
import { authMiddleware } from "@middlewares/auth.middleware";
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
import { RoutesConstants } from "../constants/route.constants";
import { upload } from "../services/cloudinary.service";

const router = Router();

// Create story
router.post(
    RoutesConstants.STORY.ALL,
    authMiddleware,
    upload.single('file'),
    asyncHandler(StoryController.createStory)
);

// Get active stories
router.get(
    RoutesConstants.STORY.ALL,
    authMiddleware,
    asyncHandler(StoryController.getActiveStories)
);

// View story
router.post(
    RoutesConstants.STORY.VIEW,
    authMiddleware,
    asyncHandler(StoryController.viewStory)
);

// Get story viewers
router.get(
    RoutesConstants.STORY.VIEWERS,
    authMiddleware,
    asyncHandler(StoryController.getStoryViewers)
);

export default router;
