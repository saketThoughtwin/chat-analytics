import emailjs from '@emailjs/nodejs';
import { ApiError } from "@utils/ApiError";

class EmailService {
    private publicKey: string;
    private privateKey: string;
    private serviceId: string;
    private templateId: string;

    constructor() {
        this.publicKey = process.env.EMAILJS_PUBLIC_KEY || '';
        this.privateKey = process.env.EMAILJS_PRIVATE_KEY || '';
        this.serviceId = process.env.EMAILJS_SERVICE_ID || '';
        this.templateId = process.env.EMAILJS_TEMPLATE_ID || '';

        if (!this.publicKey || !this.privateKey || !this.serviceId || !this.templateId) {
            console.warn("⚠️ Credentials missing in environment variables");
        }
    }

    async sendOTP(toName: string, toEmail: string, otp: string) {
        try {
            console.log(`📧 Sending OTP to ${toEmail}`);

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                {
                    to_name: toName,
                    to_email: toEmail,
                    otp_code: otp,
                    time: new Date().toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata' // Matching your local time zone
                    })
                },
                {
                    publicKey: this.publicKey,
                    privateKey: this.privateKey,
                }
            );

            console.log("✅ Email sent successfully", response.status, response.text);
            return response;
        } catch (error: any) {
            console.error("❌ Error Found:", error);
            throw new ApiError(500, `Failed to send email: ${error.message || 'Unknown error'}`);
        }
    }
}

export default new EmailService();
