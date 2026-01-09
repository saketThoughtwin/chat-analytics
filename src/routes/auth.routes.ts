import { Router } from "express";
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
import UserController from "@modules/users/user.controller";
const router = Router();
router.post('/auth/register',asyncHandler(UserController.register));
router.post('/auth/login',asyncHandler(UserController.login));
export default router;
