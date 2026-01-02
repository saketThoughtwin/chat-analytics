/**
 * @swagger
 * /api/profile/me:
 *   get:
 *     tags: [Profile]
 *     summary: Get logged-in user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched
 *       401:
 *         description: Unauthorized
 */

import { Router } from 'express';
import ProfileController from '@modules/users/profile.controller';
import { authMiddleware } from '@middlewares/auth.middleware';

const router = Router();

router.get('/profile/me', authMiddleware, ProfileController.me);

export default router;
