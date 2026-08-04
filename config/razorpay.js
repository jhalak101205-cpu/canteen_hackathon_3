const Razorpay = require("razorpay");

const getKeyId = () => (process.env.RAZORPAY_KEY_ID || process.env.Test_API_KEY_razorpay || "").trim();
const getKeySecret = () => (process.env.RAZORPAY_KEY_SECRET || process.env.Test_API_secret_KEY_razorpay || "").trim();

const isConfigured = () => Boolean(getKeyId() && getKeySecret());

let instance = null;

function getInstance() {
    if (!instance && isConfigured()) {
        instance = new Razorpay({
            key_id: getKeyId(),
            key_secret: getKeySecret(),
        });
    }
    return instance;
}

module.exports = {
    getInstance,
    getKeyId,
    getKeySecret,
    isConfigured,
};