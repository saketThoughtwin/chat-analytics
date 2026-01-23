import nodemailer from "nodemailer";
import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

class EmailService {
    private transporter!: nodemailer.Transporter;

    constructor() {
        this.createTransporter();
    }

    private async createTransporter() {
        try {
            const oauth2Client = new OAuth2(
                process.env.CLIENT_ID,
                process.env.CLIENT_SECRET,
                "https://developers.google.com/oauthplayground"
            );

            oauth2Client.setCredentials({
                refresh_token: process.env.REFRESH_TOKEN,
            });

            const accessToken = await new Promise<string>((resolve, reject) => {
                oauth2Client.getAccessToken((err, token) => {
                    if (err) {
                        reject("Failed to create access token : " + err);
                    }
                    resolve(token || "");
                });
            });

            this.transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    type: "OAuth2",
                    user: process.env.MAIL_USER,
                    accessToken,
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET,
                    refreshToken: process.env.REFRESH_TOKEN,
                },
            });
        } catch (error) {
            console.error("Email Service Error:", error);
        }
    }

    async sendOTP(to: string, otp: string) {
        if (!this.transporter) {
            await this.createTransporter();
        }

        const mailOptions = {
            from: process.env.MAIL_USER,
            to,
            subject: "Your Verification Code - Chat Analytics",
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

        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`OTP sent to ${to}`);
        } catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send verification email");
        }
    }
}

export default new EmailService();
