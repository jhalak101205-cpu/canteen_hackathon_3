const express = require("express");
const router = express.Router();

const Order = require("../modals/OrderSchema");
const Payment = require("../modals/PaymentSchema");

router.post("/create-order", async (req, res) => {
  try {
    const {
      studentName,
      studentEmail,
      studentPhone,
      items,
      totalAmount,
      paymentMethod,
      upiTransactionId,
    } = req.body;

    if (!studentName || !items || items.length === 0 || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing order details",
      });
    }

    let normalizedPaymentMethod = "cash";
    let paymentStatus = "PENDING";
    let dueDate = null;
    let paidAt = null;

    if (paymentMethod === "UPI") {
      normalizedPaymentMethod = "upi";
      paymentStatus = "PAID";
      paidAt = new Date();
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
