const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    studentName: {
      type: String,
      required: true,
    },

    studentEmail: {
      type: String,
    },

    studentPhone: {
      type: String,
    },

    collegeName: {
      type: String,
      default: "Mirai School of Technology",
    },

    items: [
      {
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["UPI", "PAY_LATER", "PAY_AT_COUNTER"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },

    orderStatus: {
      type: String,
      enum: ["RECEIVED", "APPROVED", "PREPARING", "READY", "DELIVERED", "CANCELLED"],
      default: "RECEIVED",
    },

    estimatedTime: {
      type: Number,
      default: 15,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    upiTransactionId: {
      type: String,
      default: null,
    },

    paymentReference: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);