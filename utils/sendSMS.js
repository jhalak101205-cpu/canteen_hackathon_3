const axios = require("axios");

async function sendOtpSms(phone, otp) {
    const response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
            authorization: process.env.FAST2SMS_API_KEY,
            route: "otp",
            variables_values: otp,
            numbers: phone
        }
    });

    return response.data;
}

module.exports = sendOtpSms;