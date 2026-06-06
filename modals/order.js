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

                qty: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],

        totalAmount: {
            type: Number,
            required: true
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "upi"],
            default: "cash"
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