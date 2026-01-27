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
            console.warn("⚠️ EmailJS credentials missing in environment variables");
        }
    }

    async sendOTP(toName: string, toEmail: string, otp: string) {
        try {
            console.log(`📧 Sending OTP to ${toEmail} via EmailJS (Backend)...`);

            const response = await emailjs.send(
                this.serviceId,
                this.templateId,
                {
                    to_name: toName,
                    to_email: toEmail,
                    otp_code: otp,
                },
                {
                    publicKey: this.publicKey,
                    privateKey: this.privateKey,
                }
            );

            console.log("✅ Email sent successfully via EmailJS:", response.status, response.text);
            return response;
        } catch (error: any) {
            console.error("❌ EmailJS Error:", error);
            throw new ApiError(500, `Failed to send email: ${error.message || 'Unknown error'}`);
        }
    }
}

export default new EmailService();
