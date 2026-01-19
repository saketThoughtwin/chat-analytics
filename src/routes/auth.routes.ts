import { Router } from "express";
import { asyncHandler } from "@middlewares/asyncHandlerMiddleware";
import UserController from "controller/user.controller";
import { authMiddleware } from "@middlewares/auth.middleware";
import { RoutesConstants } from "../constants/route.constants";

const router = Router();
router.post(`${RoutesConstants.AUTH.DEFAULT}${RoutesConstants.AUTH.SIGNUP}`, asyncHandler(UserController.register));
router.post(`${RoutesConstants.AUTH.DEFAULT}${RoutesConstants.AUTH.LOGIN}`, asyncHandler(UserController.login));
router.get(`${RoutesConstants.USER.DEFAULT}${RoutesConstants.USER.SEARCH}`, authMiddleware, asyncHandler(UserController.searchUsers));
export default router;
