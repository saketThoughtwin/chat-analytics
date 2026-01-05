/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Saket
 *               email:
 *                 type: string
 *                 example: saket@mail.com
 *               password:
 *                 type: string
 *                 example: Test@123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: saket@mail.com }
 *               password: { type: string, example: Test@123 }
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */

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