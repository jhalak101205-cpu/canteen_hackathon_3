const express = require("express");
const router = express.Router();

const StudentMenu = require("../modals/studentMenu");
const Order = require("../modals/order");

// Browse menu
router.get("/menu", async (req, res) => {
    try {
        const menuItems = await StudentMenu.find({ isAvailable: true });

        res.render("student/menu", { menuItems });
    } catch (err) {
        console.log(err);
        res.send("Error loading menu");
    }
});

// Cart page
router.get("/cart", (req, res) => {
    res.render("student/cart");
});

// Payment page
router.get("/payment", (req, res) => {
    res.render("student/payment");
});

// Save order in MongoDB
router.post("/order/place", async (req, res) => {
    try {
        const { studentName, phone, items, totalAmount, paymentMethod } = req.body;

        if (!studentName || !phone || !items || items.length === 0 || !totalAmount) {
            return res.status(400).json({
                success: false,
                message: "Missing order details"
            });
        }

        const newOrder = await Order.create({
            studentName,
            phone,
            items,
            totalAmount,
            paymentMethod
        });

        res.json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder._id
        });
    } catch (err) {
        console.log(err);

        res.status(500).json({
            success: false,
            message: "Error placing order"
        });
    }
});

// Success page
router.get("/success", (req, res) => {
    res.render("student/success");
});

module.exports = router;