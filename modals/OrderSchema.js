const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    // Student info (supporting both versions of fields)
    studentName: { type: String, required: true, trim: true },
    studentPhone: { type: String, trim: true },
    phone: { type: String, trim: true },
    studentEmail: { type: String, trim: true },

    // Order details (supporting quantity/qty, image, etc.)
    items: [
        {
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentMenu' },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number },
            qty: { type: Number },
            image: { type: String }
        }
    ],

    totalAmount: { type: Number, required: true },

    // Unique token shown to student e.g. T-7422
    token: { type: String, unique: true },

    paymentMethod: {
        type: String,
        enum: ["cash", "upi", "UPI", "PAY_LATER", "PAY_AT_COUNTER"],
        default: "cash"
    },

    status: {
        type: String,
        enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled', 'Preparing', 'Ready', 'Delivered'],
        default: 'pending'
    }
}, { timestamps: true });

// Auto-generate token and sync phone & quantity fields before saving
orderSchema.pre('save', async function (next) {
    // 1. Generate token if not present
    if (!this.token) {
        const random = Math.floor(1000 + Math.random() * 9000);
        this.token = `T-${random}`;
    }

    // 2. Sync studentPhone and phone fields
    if (this.studentPhone && !this.phone) {
        this.phone = this.studentPhone;
    } else if (this.phone && !this.studentPhone) {
        this.studentPhone = this.phone;
    }

    // 3. Sync quantity and qty fields inside items
    if (this.items && this.items.length > 0) {
        this.items.forEach(item => {
            if (item.quantity && !item.qty) {
                item.qty = item.quantity;
            } else if (item.qty && !item.quantity) {
                item.quantity = item.qty;
            }
        });
    }

    next();
});

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);