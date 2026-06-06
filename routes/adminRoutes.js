const express = require('express');
const router = express.Router();
const Admin = require('../modals/AdminSchema');
const Order = require('../modals/UserSchema'); // your Order model

// Middleware to protect admin routes
function isAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.redirect('/auth/adminLogin');
}

// POST /auth/adminLogin — handle login form
router.post('/auth/adminLogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email, password }); // hash passwords in prod!
        if (!admin) {
            return res.render('auth/adminLogin', { error: 'Invalid credentials' });
        }
        req.session.isAdmin = true;
        req.session.adminEmail = email;
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// GET /admin/dashboard
router.get('/admin/dashboard', isAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({
            status: { $in: ['Preparing', 'Ready'] }
        });
        // Sum up revenue from delivered orders
        const revenueData = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const revenue = revenueData[0]?.total || 0;

        res.render('admin/dashboard', { totalOrders, pendingOrders, revenue });
    } catch (err) {
        console.error(err);
        res.render('admin/dashboard', { totalOrders: 0, pendingOrders: 0, revenue: 0 });
    }
});

// GET /admin/orders — show all real orders
router.get('/admin/orders', isAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.render('admin/orders', { orders });
    } catch (err) {
        console.error(err);
        res.render('admin/orders', { orders: [] });
    }
});

// POST /admin/orders/:id/status — update order status (used by buttons + socket)
router.post('/admin/orders/:id/status', isAdmin, async (req, res) => {
    const { status } = req.body; // 'Preparing' | 'Ready' | 'Delivered'
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        // Emit real-time update to the student
        const io = req.app.get('io');
        io.emit(`order-status-${order.token}`, { status });

        res.json({ success: true, status: order.status });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// GET /admin/logout
router.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/adminLogin');
});

module.exports = router;