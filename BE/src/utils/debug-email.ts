import "dotenv/config";
import nodemailer from "nodemailer";
import { google } from "googleapis";

const OAuth2 = google.auth.OAuth2;

async function debugEmail() {
    console.log("🔍 Starting Email Debugging Script...");
    console.log("------------------------------------");

    const credentials = {
        user: process.env.MAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    };

    console.log("1. Checking Environment Variables:");
    console.log(`   - MAIL_USER: ${credentials.user ? "✅ Present" : "❌ Missing"}`);
    console.log(`   - CLIENT_ID: ${credentials.clientId ? "✅ Present" : "❌ Missing"}`);
    console.log(`   - CLIENT_SECRET: ${credentials.clientSecret ? "✅ Present" : "❌ Missing"}`);
    console.log(`   - REFRESH_TOKEN: ${credentials.refreshToken ? "✅ Present" : "❌ Missing"}`);

    if (!credentials.user || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
        console.error("\n❌ Error: Missing required environment variables. Please check your .env file.");
        return;
    }

    console.log("\n2. Attempting to generate OAuth2 Access Token:");
    const oauth2Client = new OAuth2(
        credentials.clientId,
        credentials.clientSecret,
        "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: credentials.refreshToken,
    });

    try {
        const accessToken = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("OAuth2 Access Token Timeout (10s)")), 10000);
            oauth2Client.getAccessToken((err, token) => {
                clearTimeout(timeout);
                if (err) {
                    reject(err);
                }
                resolve(token || "");
            });
        });
        console.log("   ✅ Access Token generated successfully.");

        console.log("\n3. Verifying Nodemailer Transporter:");
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: credentials.user,
                accessToken,
                clientId: credentials.clientId,
                clientSecret: credentials.clientSecret,
                refreshToken: credentials.refreshToken,
            },
        });

        await Promise.race([
            transporter.verify(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Transporter Verification Timeout (10s)")), 10000)
            )
        ]);
        console.log("   ✅ Transporter verified and ready to send emails.");

        console.log("\n🚀 SUCCESS: Your email configuration is working perfectly!");

    } catch (error: any) {
        console.error("\n❌ FAILED: Email initialization failed.");
        console.error("   Error Message:", error.message || error);
        if (error.response) {
            console.error("   Response Data:", JSON.stringify(error.response.data, null, 2));
        }
        console.log("\n💡 Suggestions:");
        console.log("   - Check if your REFRESH_TOKEN has expired or been revoked.");
        console.log("   - Ensure the Google Cloud Project has the Gmail API enabled.");
        console.log("   - Verify that the Redirect URI in Google Cloud Console is set to https://developers.google.com/oauthplayground (if using that for token generation).");
        console.log("   - Check your internet connection or firewall settings.");
    }
}

debugEmail();
