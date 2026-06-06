const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        studentName: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        items: [
            {
                itemId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "StudentMenu"
                },

                name: {
                    type: String,
                    required: true
                },

                price: {
                    type: Number,
                    required: true
                },

                image: {
                    type: String
                },

                category: {
                    type: String
                },

                qty: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],

        itemTotal: {
            type: Number,
            required: true
        },

        packingCharge: {
            type: Number,
            default: 10
        },

        gstAmount: {
            type: Number,
            required: true
        },

        grandTotal: {
            type: Number,
            required: true
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "upi"],
            required: true
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending"
        },

        status: {
            type: String,
            enum: ["pending", "preparing", "ready", "completed", "cancelled"],
            default: "pending"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);