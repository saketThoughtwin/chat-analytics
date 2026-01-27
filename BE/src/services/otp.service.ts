import { redis } from "@config/redis";

class OTPService {
    private readonly OTP_EXPIRY = 300; // 5 minutes

    async generateOTP(email: string): Promise<string> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.set(`otp:${email}`, otp, "EX", this.OTP_EXPIRY);
        return otp;
    }

    async verifyOTP(email: string, otp: string): Promise<boolean> {
        const storedOtp = await redis.get(`otp:${email}`);
        if (storedOtp === otp) {
            await redis.del(`otp:${email}`);
            return true;
        }
        return false;
    }
}

export default new OTPService();
