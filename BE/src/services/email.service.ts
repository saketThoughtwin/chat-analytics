import { Resend } from "resend";
import { ApiError } from "@utils/ApiError";

class EmailService {
    private resend: Resend;

    constructor() {
        if (!process.env.RESEND_API_KEY) {
            console.error("❌ RESEND_API_KEY is missing in environment variables");
        }
        this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    async sendOTP(to: string, otp: string) {
        try {
            console.log(`📧 Sending OTP to ${to} via Resend...`);

            const { data, error } = await this.resend.emails.send({
                from: 'Chat Analytics <onboarding@resend.dev>',
                to: [to],
                subject: 'Your Verification Code',
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; color: #1f2937;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">Verify Your Email</h2>
            <p style="font-size: 16px; line-height: 24px; margin-bottom: 24px;">
              Thank you for signing up for Chat Analytics! Please use the following code to verify your email address:
            </p>
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
              <h1 style="color: #111827; letter-spacing: 8px; margin: 0; font-size: 32px; font-weight: bold;">${otp}</h1>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">This code will expire in 5 minutes.</p>
            <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; pt: 16px; margin-top: 16px;">
              If you didn't request this code, you can safely ignore this email.
            </p>
          </div>
        `,
            });

            if (error) {
                console.error("❌ Resend Error:", error);
                throw new ApiError(500, `Resend Error: ${error.message}`);
            }

            console.log("✅ Email sent successfully via Resend:", data?.id);
            return data;
        } catch (error: any) {
            console.error("❌ Error sending email:", error);
            throw new ApiError(500, error.message || "Failed to send verification email");
        }
    }
}

export default new EmailService();
