

import { Router } from 'express';
import ProfileController from '@modules/users/profile.controller';
import { authMiddleware } from '@middlewares/auth.middleware';
import { asyncHandler } from '@utils/asyncHandler';

const router = Router();

router.get('/profile/me', authMiddleware, asyncHandler(ProfileController.me));

export default router;
