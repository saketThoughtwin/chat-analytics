

import { Request, Response } from "express";
import userService from "@modules/users/user.service";
import { signToken } from "@utils/jwt";
import { setSession, redis } from "@config/redis";
import { ApiError } from "@utils/ApiError";
class UserController {
  static async register(req: Request, res: Response) {

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new ApiError(400, "All fields are required");
    }
    const user = await userService.register(name, email, password);

    res.status(201).json({ success: true, data: user, messgae: "user registerd successfully" });
  }
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user = await userService.login(email, password);
    if (!user) {
      throw new ApiError(401, "Invalid email or password");
    }

    const token = signToken(String(user._id));

    await setSession(String(user._id), token);
    await redis.sadd('online_users', String(user._id));

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      message: "Login Successfull"
    });
  }

  static async searchUsers(req: Request, res: Response) {
    const { q } = req.query;
    const { userId } = req as any; // Assuming authMiddleware attaches userId
    const users = await userService.searchUsers(String(q || ""), userId);
    res.json(users);
  }
}
export default UserController;