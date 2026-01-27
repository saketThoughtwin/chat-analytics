import nodemailer from "nodemailer";
import { ApiError } from "@utils/ApiError";

class EmailService {
    private createTransporter() {
        const host = process.env.EMAIL_HOST || "";
        const port = parseInt(process.env.EMAIL_PORT || "587");
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;

        console.log(`🛠️ Initializing SMTP Transporter: ${host}:${port} (User: ${user})`);

        try {
            const transporterConfig: any = {
                auth: {
                    user,
                    pass,
                },
                connectionTimeout: 15000, // Increased to 15s
                greetingTimeout: 15000,
                socketTimeout: 15000,
                dnsTimeout: 10000,
                debug: true,
                logger: true,
                tls: {
                    // Do not fail on invalid certs (common in some hosting environments)
                    rejectUnauthorized: false,
                    // Force specific TLS version if needed
                    minVersion: "TLSv1.2"
                }
            };

            // If it's Gmail, use the built-in 'gmail' service configuration
            // This is often more reliable than manual host/port config
            if (host.includes("gmail.com") || user?.includes("@gmail.com")) {
                console.log("💡 Using Gmail service preset for better reliability");
                transporterConfig.service = "gmail";
            } else {
                transporterConfig.host = host;
                transporterConfig.port = port;
                transporterConfig.secure = port === 465;
            }

            return nodemailer.createTransport(transporterConfig);
        } catch (error) {
            console.error("❌ Transporter creation error:", error);
            throw new ApiError(500, "Failed to initialize email service");
        }
    }

    async sendOTP(to: string, otp: string) {
        try {
            console.log(`📧 Attempting to send OTP to ${to} via SMTP...`);
            const transporter = this.createTransporter();

            // Verify connection configuration
            try {
                // We use a shorter timeout for verification to fail fast
                await Promise.race([
                    transporter.verify(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Verification Timeout")), 10000))
                ]);
                console.log("✅ SMTP Connection verified successfully");
            } catch (verifyError: any) {
                console.error("❌ SMTP Verification failed:", verifyError.message);
                // We don't throw here, we try to send anyway as verify() can sometimes be flaky
            }

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
            console.error("❌ Error sending email detail:", {
                message: error.message,
                code: error.code,
                command: error.command,
                response: error.response
            });
            throw new ApiError(500, `Failed to send verification email: ${error.message}`);
        }
    }
}

export default new EmailService();
