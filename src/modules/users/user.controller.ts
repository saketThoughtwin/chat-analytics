

import { Request, Response } from "express";
import userService from "./user.service";
import { signToken } from "@utils/jwt";
import { setSession, redis } from "@config/redis";

class UserController {
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;
      const user = await userService.register(name, email, password);
      res.status(201).json({ success: true, data: user, messgae: "user registerd successfully" });
    }
    catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user = await userService.login(email, password);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

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


}
export default UserController;