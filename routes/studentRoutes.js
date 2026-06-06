const express = require("express");
const router = express.Router();

const StudentMenu = require("../modals/studentMenu");
const Order = require("../modals/order");

// ===============================
// STUDENT: Browse Menu
// URL: /student/menu
// ===============================
router.get("/menu", async (req, res) => {
    try {
        const menuItems = await StudentMenu.find({ isAvailable: true });

        res.render("student/menu", { menuItems });
    } catch (err) {
        console.log("MENU ERROR:", err);
        res.send("Error loading menu");
    }
});

// ===============================
// STUDENT: Cart Page
// URL: /student/cart
// ===============================
router.get("/cart", (req, res) => {
    res.render("student/cart");
});

// ===============================
// STUDENT: Payment Page
// URL: /student/payment
// ===============================
router.get("/payment", (req, res) => {
    res.render("student/payment");
});

// ===============================
// STUDENT: Place Order
// URL: /student/order/place
// ===============================
router.post("/order/place", async (req, res) => {
    try {
        const {
            studentName,
            phone,
            items,
            itemTotal,
            packingCharge,
            gstAmount,
            grandTotal,
            paymentMethod,
            paymentStatus
        } = req.body;

        console.log("ORDER BODY:", req.body);

        if (!studentName || !phone) {
            return res.status(400).json({
                success: false,
                message: "Student name and phone number are required"
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cart is empty"
            });
        }

        if (
            itemTotal === undefined ||
            packingCharge === undefined ||
            gstAmount === undefined ||
            grandTotal === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "Bill details are missing"
            });
        }

        const order = await Order.create({
            studentName,
            phone,
            items,
            itemTotal,
            packingCharge,
            gstAmount,
            grandTotal,
            paymentMethod,
            paymentStatus
        });

        res.json({
            success: true,
            message: "Order placed successfully",
            orderId: order._id
        });

    } catch (err) {
        console.log("ORDER ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Error placing order"
        });
    }
});

// ===============================
// STUDENT: Success Page
// URL: /student/success
// ===============================
router.get("/success", (req, res) => {
    res.render("student/success");
});

module.exports = router;