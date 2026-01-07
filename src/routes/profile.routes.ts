

import { Router } from 'express';
import ProfileController from '@modules/users/profile.controller';
import { authMiddleware } from '@middlewares/auth.middleware';

const router = Router();

router.get('/profile/me', authMiddleware, ProfileController.me);

export default router;
