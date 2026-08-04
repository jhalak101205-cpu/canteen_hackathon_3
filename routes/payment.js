const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const Order = require("../modals/OrderSchema");
const Payment = require("../modals/PaymentSchema");
const razorpayConfig = require("../config/razorpay");

// GET /api/payment/razorpay-key
router.get("/razorpay-key", (req, res) => {
  res.json({
    success: true,
    keyId: razorpayConfig.getKeyId(),
    isConfigured: razorpayConfig.isConfigured(),
  });
});

// POST /api/payment/create-razorpay-order
router.post("/create-razorpay-order", async (req, res) => {
  try {
    let {
      studentName,
      studentEmail,
      studentPhone,
      items,
      totalAmount,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0 || !totalAmount || Number(totalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order details or total amount.",
      });
    }

    if (!razorpayConfig.isConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Razorpay credentials are not configured on the server.",
      });
    }

    const razorpayInstance = razorpayConfig.getInstance();
    if (!razorpayInstance) {
      return res.status(500).json({
        success: false,
        message: "Failed to initialize Razorpay SDK instance.",
      });
    }

    const amountInPaise = Math.round(Number(totalAmount) * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        studentName: studentName || "Student",
        studentEmail: studentEmail || "",
      },
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    if (!studentName || typeof studentName !== "string" || !studentName.trim()) {
      studentName = "Student";
    }

    const formattedItems = items.map((item) => ({
      itemId: item.itemId || undefined,
      name: item.name,
      price: Number(item.price),
      image: item.image || "🍽️",
      qty: Number(item.qty || item.quantity || 1),
    }));

    const newOrder = await Order.create({
      studentName,
      phone: studentPhone || "0000000000",
      items: formattedItems,
      totalAmount: Number(totalAmount),
      paymentMethod: "razorpay",
      status: "pending",
    });

    const payment = await Payment.create({
      orderId: newOrder._id,
      studentName,
      studentEmail,
      studentPhone,
      totalAmount: Number(totalAmount),
      paymentMethod: "RAZORPAY",
      paymentStatus: "PENDING",
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(201).json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayConfig.getKeyId(),
      orderId: newOrder._id,
      paymentId: payment._id,
      token: newOrder.token,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create Razorpay order",
    });
  }
});

// POST /api/payment/verify-razorpay-payment
router.post("/verify-razorpay-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification fields.",
      });
    }

    const keySecret = razorpayConfig.getKeySecret();
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: "Razorpay secret key not found on server.",
      });
    }

    const bodyData = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(bodyData.toString())
      .digest("hex");

    let isSignatureValid = false;
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpay_signature)
      );
    } catch (e) {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      await Payment.findOneAndUpdate(
        { orderId },
        {
          paymentStatus: "FAILED",
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        }
      );

      return res.status(400).json({
        success: false,
        message: "Security error: Invalid Razorpay payment signature.",
      });
    }

    const updatedPayment = await Payment.findOneAndUpdate(
      { orderId },
      {
        paymentStatus: "PAID",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
      },
      { new: true }
    );

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: "pending" },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Associated order not found.",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("new-order", {
        orderId: updatedOrder._id,
        token: updatedOrder.token,
        studentName: updatedOrder.studentName,
        phone: updatedOrder.phone,
        items: updatedOrder.items,
        totalAmount: updatedOrder.totalAmount,
        paymentMethod: updatedOrder.paymentMethod,
        paymentStatus: "PAID",
        status: updatedOrder.status,
        createdAt: updatedOrder.createdAt,
      });
    }

    res.json({
      success: true,
      message: "Payment verified successfully!",
      order: updatedOrder,
      payment: updatedPayment,
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during payment verification",
    });
  }
});


router.post("/create-order", async (req, res) => {
  try {
    let {
      studentName,
      studentEmail,
      studentPhone,
      items,
      totalAmount,
      paymentMethod,
      upiTransactionId,
    } = req.body;

    if (!studentName || typeof studentName !== "string" || !studentName.trim()) {
      studentName = "Student";
    }

    if (!items || !Array.isArray(items) || items.length === 0 || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing order details. Please check items and payment method.",
      });
    }

    let normalizedPaymentMethod = "cash";
    let paymentStatus = "PENDING";
    let dueDate = null;
    let paidAt = null;

    if (paymentMethod === "UPI") {
      normalizedPaymentMethod = "upi";
      paymentStatus = upiTransactionId ? "PAID" : "PENDING";
      paidAt = upiTransactionId ? new Date() : null;
    }

    if (paymentMethod === "PAY_AT_COUNTER") {
      normalizedPaymentMethod = "cash";
      paymentStatus = "PENDING";
    }

    if (paymentMethod === "PAY_LATER") {
      normalizedPaymentMethod = "cash";
      paymentStatus = "PENDING";
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
    }

    const formattedItems = items.map((item) => ({
      itemId: item.itemId || undefined,
      name: item.name,
      price: Number(item.price),
      image: item.image || "🍽️",
      qty: Number(item.qty || item.quantity || 1),
    }));

    const newOrder = await Order.create({
      studentName,
      phone: studentPhone || "0000000000",
      items: formattedItems,
      totalAmount: Number(totalAmount),
      paymentMethod: normalizedPaymentMethod,
      status: "pending",
    });

    const payment = await Payment.create({
      orderId: newOrder._id,
      studentName,
      studentEmail,
      studentPhone,
      totalAmount: Number(totalAmount),
      paymentMethod,
      paymentStatus,
      upiTransactionId: upiTransactionId || null,
      dueDate,
      paidAt,
    });

    const io = req.app.get("io");

    io.emit("new-order", {
      orderId: newOrder._id,
      token: newOrder.token,
      studentName: newOrder.studentName,
      phone: newOrder.phone,
      items: newOrder.items,
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus,
      status: newOrder.status,
      dueDate,
      createdAt: newOrder.createdAt,
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
      payment,
    });
  } catch (error) {
    console.log("Create payment order error:", error);

    res.status(500).json({
      success: false,
      message: "Server error while creating order",
    });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to fetch orders",
    });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "preparing",
      "ready",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const io = req.app.get("io");

    io.emit("order-status-updated", {
      orderId: order._id,
      status: order.status,
    });

    res.json({
      success: true,
      message: "Order status updated",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to update order status",
    });
  }
});

router.patch("/orders/:id/mark-paid", async (req, res) => {
  try {
    const { upiTransactionId } = req.body;

    const payment = await Payment.findOneAndUpdate(
      { orderId: req.params.id },
      {
        paymentStatus: "PAID",
        upiTransactionId: upiTransactionId || null,
        paidAt: new Date(),
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    res.json({
      success: true,
      message: "Payment marked as paid",
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to mark payment as paid",
    });
  }
});

module.exports = router;
