import { redis } from "@config/redis";

class OTPService {
    private readonly OTP_EXPIRY = 300; // 5 minutes in seconds

    async generateOTP(email: string): Promise<string> {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const key = `otp:${email}`;

        await redis.set(key, otp, "EX", this.OTP_EXPIRY);
        return otp;
    }

    async verifyOTP(email: string, otp: string): Promise<boolean> {
        const key = `otp:${email}`;
        const storedOTP = await redis.get(key);

        if (storedOTP === otp) {
            await redis.del(key); // Delete OTP after successful verification
            return true;
        }

        return false;
    }
}

export default new OTPService();
