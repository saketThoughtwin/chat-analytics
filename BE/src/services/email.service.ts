import nodemailer from "nodemailer";
import { ApiError } from "@utils/ApiError";

class EmailService {
    private createTransporter() {
        try {
            return nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT || "587"),
                secure: process.env.EMAIL_PORT === "465", // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        } catch (error) {
            console.error("❌ Transporter creation error:", error);
            throw new ApiError(500, "Failed to initialize email service");
        }
    }

    async sendOTP(to: string, otp: string) {
        try {
            console.log(`📧 Sending OTP to ${to} via SMTP...`);
            const transporter = this.createTransporter();

            const mailOptions = {
                from: `"Chat Analytics" <${process.env.EMAIL_USER}>`,
                to: to,
                subject: "Your Verification Code",
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Verify Your Email</h2>
            <p>Thank you for signing up! Please use the following code to verify your email address:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #1f2937; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
            };

            const result = await transporter.sendMail(mailOptions);
            console.log("✅ Email sent successfully:", result.messageId);
            return result;
        } catch (error: any) {
            console.error("❌ Error sending email:", error);
            throw new ApiError(500, "Failed to send verification email");
        }
    }
}

export default new EmailService();
