const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Student info (no login needed)
    studentName: { type: String, required: true },
    studentPhone: { type: String, required: true },
    studentEmail: { type: String, required: true },

    // Order details
    items: [
        {
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentMenu' },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true }
        }
    ],

    totalAmount: { type: Number, required: true },

    // Unique token shown to student e.g. T-7422
    token: { type: String, unique: true },

    status: {
        type: String,
        enum: ['Preparing', 'Ready', 'Delivered'],
        default: 'Preparing'
    }
}, { timestamps: true });

// Auto-generate token before saving
orderSchema.pre('save', async function (next) {
    if (!this.token) {
        const random = Math.floor(1000 + Math.random() * 9000);
        this.token = `T-${random}`;
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);