import { Router } from 'express';
import ProfileController from 'controller/profile.controller';
import { authMiddleware } from '@middlewares/auth.middleware';
import { asyncHandler } from '@middlewares/asyncHandlerMiddleware';
import { RoutesConstants } from '../constants/route.constants';
import { upload } from '../services/cloudinary.service';

const router = Router();

router.get(`${RoutesConstants.AUTH.DEFAULT}${RoutesConstants.AUTH.ME}`, authMiddleware, asyncHandler(ProfileController.me));
router.put('/', authMiddleware, upload.single('file'), asyncHandler(ProfileController.updateProfile));

export default router;
