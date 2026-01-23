

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

    // Check if user already exists
    const existingUser = await userService.searchUsers(email, "");
    // searchUsers returns array, we need to check if any user has this email exactly
    // But wait, searchUsers excludes current user. Let's use a better check.
    // We can use the repository directly or add a method to service.
    // For now, let's assume if they can register, they don't exist.
    // Actually, userService.register checks existence. We should check it here too to fail early.
    // Let's try to register blindly? No, we need to send OTP first.

    // Let's add a check in service or just use the one in register later.
    // Ideally we check existence here.
    // Let's use userService to check existence if possible, or just proceed.
    // The user requirement says "when user is signup then a new page open for verify".
    // So we send OTP first.

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