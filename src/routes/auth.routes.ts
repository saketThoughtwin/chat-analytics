import { Router } from "express";
import UserController from "../modules/users/user.controller";
const router = Router();
router.post('/auth/register',UserController.register);
router.post('/auth/login',UserController.login);
export default router;
