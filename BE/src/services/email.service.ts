import nodemailer from "nodemailer";
import { google } from "googleapis";
import { ApiError } from "@utils/ApiError";

const OAuth2 = google.auth.OAuth2;

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializeTransporter().catch(err => {
      console.error("❌ Initial Email Service Init Failed:", err);
    });
  }

  private async initializeTransporter(): Promise<void> {
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        console.log("📧 Initializing Email Transporter...");

        const {
          MAIL_USER,
          CLIENT_ID,
          CLIENT_SECRET,
          REFRESH_TOKEN
        } = process.env;

        if (!MAIL_USER || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
          throw new Error("Missing email environment variables");
        }

        const oauth2Client = new OAuth2(
          CLIENT_ID,
          CLIENT_SECRET,
          "https://developers.google.com/oauthplayground"
        );

        oauth2Client.setCredentials({
          refresh_token: REFRESH_TOKEN,
        });

        const accessToken = await oauth2Client.getAccessToken();

        this.transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,              // ✅ Correct port
          secure: true,           // ✅ Required for 465
          auth: {
            type: "OAuth2",
            user: MAIL_USER,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: accessToken.token!,
          },
        });

        console.log("✅ Email transporter initialized");
      } catch (err) {
        console.error("❌ Email initialization failed:", err);
        this.transporter = null;
        throw err;
      } finally {
        this.initializationPromise = null;
      }
    })();

    return this.initializationPromise;
  }

  async sendOTP(to: string, otp: string) {
    if (!this.transporter) {
      await this.initializeTransporter();
    }

    if (!this.transporter) {
      throw new ApiError(500, "Email service unavailable");
    }

    const mailOptions = {
      from: `"Chat Analytics" <${process.env.MAIL_USER}>`,
      to,
      subject: "Your Verification Code",
      html: `
        <div style="font-family: Arial;">
          <h2>Verify Your Email</h2>
          <p>Your OTP is:</p>
          <h1 style="letter-spacing:4px">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${to}`);
  }
}

export default new EmailService();
