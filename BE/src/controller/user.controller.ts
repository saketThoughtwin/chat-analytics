

import { Request, Response } from "express";
import userService from "@modules/users/user.service";
import { signToken } from "@utils/jwt";
import { setSession, redis } from "@config/redis";
import { ApiError } from "@utils/ApiError";
import otpService from "@services/otp.service";
import emailService from "@services/email.service";

class UserController {
  static async sendOTP(req: Request, res: Response) {
    const { email, name } = req.body;
    if (!email || !name) {
      throw new ApiError(400, "Email and Name are required");
    }

    const otp = await otpService.generateOTP(email);
    await emailService.sendOTP(email, otp);

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  }

  static async register(req: Request, res: Response) {
    const { name, email, password, otp } = req.body;
    if (!name || !email || !password || !otp) {
      throw new ApiError(400, "All fields are required including OTP");
    }

    const isOtpValid = await otpService.verifyOTP(email, otp);
    if (!isOtpValid) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    const user = await userService.register(name, email, password);

    res.status(201).json({ success: true, data: user, message: "User registered successfully" });
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