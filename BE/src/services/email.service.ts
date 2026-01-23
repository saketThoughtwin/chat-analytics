import { Resend } from 'resend';
import { ApiError } from "@utils/ApiError";

class EmailService {
    private resend: Resend | null = null;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error("❌ RESEND_API_KEY is missing in environment variables");
        } else {
            this.resend = new Resend(apiKey);
            console.log("✅ Resend Email Service initialized");
        }
    }

    async sendOTP(to: string, otp: string) {
        try {
            if (!this.resend) {
                console.error("❌ Cannot send email: Resend not initialized (missing API Key)");
                throw new ApiError(500, "Email service configuration error");
            }

            console.log(`📧 Attempting to send OTP to: ${to}`);

            const fromEmail = process.env.MAIL_FROM || 'Chat Analytics <onboarding@resend.dev>';

            const { data, error } = await this.resend.emails.send({
                from: fromEmail,
                to: [to],
                subject: 'Your Verification Code',
                html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #4f46e5; padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">Verify Your Email</h2>
            </div>
            <div style="padding: 30px; background-color: white;">
              <p style="color: #374151; font-size: 16px;">Thank you for signing up! Please use the following code to verify your email address:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 1px dashed #9ca3af;">
                <h1 style="color: #111827; letter-spacing: 8px; margin: 0; font-size: 36px;">${otp}</h1>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This code will expire in <b>5 minutes</b>.</p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
          </div>
        `,
            });

            if (error) {
                console.error("❌ Resend API Error:", error);
                throw new ApiError(500, `Failed to send email: ${error.message}`);
            }

            console.log(`✅ OTP successfully sent to ${to}. Resend ID: ${data?.id}`);
            return data;
        } catch (error: any) {
            console.error("❌ Email Service Exception:", error.message || error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "An unexpected error occurred while sending the verification email");
        }
    }
}

export default new EmailService();
