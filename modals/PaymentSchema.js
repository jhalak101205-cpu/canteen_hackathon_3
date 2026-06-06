const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },

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

    upiTransactionId: {
      type: String,
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);