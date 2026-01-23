import nodemailer from "nodemailer";
import { google } from "googleapis";
import { ApiError } from "@utils/ApiError";

const OAuth2 = google.auth.OAuth2;

class EmailService {
    private transporter: nodemailer.Transporter | null = null;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        this.initializeTransporter().catch(err => {
            console.error("Initial Email Service Initialization Failed:", err);
        });
    }

    private async initializeTransporter(): Promise<void> {
        if (this.initializationPromise) {
            console.log("📧 Initialization already in progress, waiting...");
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                console.log("📧 Starting Email Transporter initialization...");

                const credentials = {
                    user: process.env.MAIL_USER,
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET,
                    refreshToken: process.env.REFRESH_TOKEN,
                };

                console.log("📧 Checking Environment Variables in EmailService:");
                console.log(`   - MAIL_USER: ${credentials.user ? "✅ Present" : "❌ Missing"}`);
                console.log(`   - CLIENT_ID: ${credentials.clientId ? "✅ Present" : "❌ Missing"}`);
                console.log(`   - CLIENT_SECRET: ${credentials.clientSecret ? "✅ Present" : "❌ Missing"}`);
                console.log(`   - REFRESH_TOKEN: ${credentials.refreshToken ? "✅ Present" : "❌ Missing"}`);

                if (!credentials.user || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
                    throw new Error("Missing required email environment variables");
                }

                const oauth2Client = new OAuth2(
                    credentials.clientId,
                    credentials.clientSecret,
                    "https://developers.google.com/oauthplayground"
                );

                oauth2Client.setCredentials({
                    refresh_token: credentials.refreshToken,
                });

                console.log("📧 Requesting OAuth2 Access Token...");
                const accessToken = await Promise.race([
                    new Promise<string>((resolve, reject) => {
                        oauth2Client.getAccessToken((err, token) => {
                            if (err) {
                                console.error("📧 Failed to create access token:", err);
                                reject(err);
                            }
                            resolve(token || "");
                        });
                    }),
                    new Promise<string>((_, reject) =>
                        setTimeout(() => reject(new Error("OAuth2 Access Token Timeout")), 20000)
                    )
                ]);

                console.log("📧 Access Token obtained successfully");

                this.transporter = nodemailer.createTransport({
                    host: "smtp.gmail.com",
                    port: 587,
                    secure: true, // Use STARTTLS
                    auth: {
                        type: "OAuth2",
                        user: credentials.user,
                        accessToken,
                        clientId: credentials.clientId,
                        clientSecret: credentials.clientSecret,
                        refreshToken: credentials.refreshToken,
                    },
                    debug: true,
                    logger: true,
                    tls: {
                        rejectUnauthorized: false // Helps in some cloud environments
                    }
                });

                console.log("📧 Verifying Nodemailer Transporter (Port 587, 40s timeout)...");
                await Promise.race([
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Transporter Verification Timeout")), 40000)
                    )
                ]);

                console.log("✅ Email Transporter is ready");
            } catch (error: any) {
                console.error("❌ Email Service Initialization Error Details:", {
                    message: error.message,
                    code: error.code,
                    response: error.response?.data
                });
                this.transporter = null;
                throw error;
            } finally {
                this.initializationPromise = null;
            }
        })();

        return this.initializationPromise;
    }

    async sendOTP(to: string, otp: string) {
        console.log(`📧 Attempting to send OTP to ${to}...`);

        if (!this.transporter) {
            console.log("Transporter not initialized, attempting to initialize...");
            try {
                await this.initializeTransporter();
            } catch (error) {
                throw new ApiError(500, "Email service initialization failed. Please try again later.");
            }
        }

        if (!this.transporter) {
            throw new ApiError(500, "Email service is currently unavailable. Please try again later.");
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
            console.log(`✅ OTP sent to ${to}`);
        } catch (error) {
            console.error("❌ Error sending email:", error);
            throw new ApiError(500, "Failed to send verification email. Please check your email address and try again.");
        }
    }
}

export default new EmailService();
