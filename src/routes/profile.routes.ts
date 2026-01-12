import { Router } from 'express';
import ProfileController from 'controller/profile.controller';
import { authMiddleware } from '@middlewares/auth.middleware';
import { asyncHandler } from '@middlewares/asyncHandlerMiddleware';
import { RoutesConstants } from '../constants/route.constants';

const router = Router();

router.get(`${RoutesConstants.AUTH.DEFAULT}${RoutesConstants.AUTH.ME}`, authMiddleware, asyncHandler(ProfileController.me));

export default router;
