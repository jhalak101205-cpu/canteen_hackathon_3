const nodemailer = require("nodemailer");

console.log("\n================ [DEBUG] EMAIL CONFIGURATION ================");
console.log("[DEBUG] EMAIL_USER:", process.env.EMAIL_USER);
console.log("[DEBUG] EMAIL_PASS exists:", !!process.env.EMAIL_PASS);
if (process.env.EMAIL_PASS) {
    console.log("[DEBUG] EMAIL_PASS character length:", process.env.EMAIL_PASS.length);
}
if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes("yourgmail@gmail.com") || !process.env.EMAIL_PASS || process.env.EMAIL_PASS === "your_app_password") {
    console.log("⚠️ [WARNING] Placeholders detected for SMTP credentials in .env. NodeMailer SMTP connections will fail, and the app will fall back to Console-based OTP Delivery.");
}
console.log("===============================================================\n");

// Configure transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER || "placeholder@gmail.com",
        pass: process.env.EMAIL_PASS || "placeholder"
    }
});

// Immediate verification on module load (logs warning, does not crash)
transporter.verify((error, success) => {
    if (error) {
        console.log("💡 [INFO] NodeMailer SMTP Transporter verification failed. The application will automatically fall back to console-based OTP logging during local development.");
    } else {
        console.log("✅ [DEBUG] NodeMailer SMTP Transporter successfully verified and is ready to send emails!");
    }
});

const sendOtpMail = async (email, otp) => {
    console.log(`[DEBUG] sendOtpMail triggered for recipient: ${email}`);

    const mailOptions = {
        from: process.env.EMAIL_USER || "smartcanteen@gmail.com",
        to: email,
        subject: "Smart Canteen OTP",
        html: `
            <h2>Smart Canteen Login OTP</h2>
            <p>Your OTP is:</p>
            <h1 style="color: #3c0c54; font-size: 36px; letter-spacing: 2px;">${otp}</h1>
            <p>This OTP is valid for 5 minutes.</p>
        `
    };

    console.log("[DEBUG] Attempting to dispatch SMTP email via NodeMailer...");

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ [DEBUG] SMTP Email dispatched successfully! Message ID:", info.messageId);
        return info;
    } catch (err) {
        // Catch authentication/connection errors and log OTP to console instead of crashing the frontend
        console.warn("\n⚠️ [SMTP WARNING] SMTP Connection failed to send email. Falling back to Console-based OTP Delivery.");
        console.warn("Reason:", err.message);

        console.log("\n┌────────────────────────────────────────────────────────┐");
        console.log("│   CANTEEN EXPRESS DEVELOPMENT OTP DELIVERY           │");
        console.log(`│     Target Email: ${email.padEnd(36)} │`);
        console.log(`│     Generated OTP: ${otp.padEnd(35)} │`);
        console.log("│                                                        │");
        console.log("│     Please copy-paste this code into the frontend      │");
        console.log("│     verification modal to continue.                    │");
        console.log("└────────────────────────────────────────────────────────┘\n");

        // Return a mock success token so the route execution flows normally
        return {
            messageId: "mock-development-message-id",
            mocked: true
        };
    }
};

module.exports = sendOtpMail;