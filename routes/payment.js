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
      collegeName,
      items,
      totalAmount,
      paymentMethod,
      upiTransactionId,
    } = req.body;

    if (!studentName || !items || !totalAmount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Student name, items, total amount and payment method are required",
      });
    }

    let paymentStatus = "PENDING";
    let dueDate = null;
    let paidAt = null;

    if (paymentMethod === "UPI") {
      if (!upiTransactionId) {
        return res.status(400).json({
          success: false,
          message: "UPI transaction ID is required for UPI payment",
        });
      }

      paymentStatus = "PAID";
      paidAt = new Date();
    }

    if (paymentMethod === "PAY_LATER") {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
    }

    const order = await Order.create({
      studentName,
      studentEmail,
      studentPhone,
      collegeName,
      items,
      totalAmount,
      paymentMethod,
      paymentStatus,
      dueDate,
      upiTransactionId: upiTransactionId || null,
    });

    const payment = await Payment.create({
      orderId: order._id,
      studentName,
      studentEmail,
      studentPhone,
      totalAmount,
      paymentMethod,
      paymentStatus,
      upiTransactionId: upiTransactionId || null,
      dueDate,
      paidAt,
    });

    order.paymentReference = payment._id;
    await order.save();

    const io = req.app.get("io");

    io.emit("new-order", {
      orderId: order._id,
      studentName: order.studentName,
      studentPhone: order.studentPhone,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      estimatedTime: order.estimatedTime,
      dueDate: order.dueDate,
      createdAt: order.createdAt,
    });

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
      payment,
    });
  } catch (error) {
    console.log("Create order error:", error);

    return res.status(500).json({
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
    const { orderStatus } = req.body;

    const allowedStatus = [
      "RECEIVED",
      "APPROVED",
      "PREPARING",
      "READY",
      "DELIVERED",
      "CANCELLED",
    ];

    if (!allowedStatus.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
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
      orderStatus: order.orderStatus,
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

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        paymentStatus: "PAID",
        upiTransactionId: upiTransactionId || null,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await Payment.findOneAndUpdate(
      { orderId: order._id },
      {
        paymentStatus: "PAID",
        upiTransactionId: upiTransactionId || null,
        paidAt: new Date(),
      }
    );

    res.json({
      success: true,
      message: "Payment marked as paid",
      order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Unable to mark payment as paid",
    });
  }
});

module.exports = router;