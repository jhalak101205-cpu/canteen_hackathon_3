const express = require('express');
const router = express.Router();
const Admin = require('../modals/AdminSchema');
const Order = require('../modals/OrderSchema');
const Menu = require('../modals/studentMenu');

// Middleware to protect admin routes
function isAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) return next();
    res.redirect('/auth/adminLogin');
}

// ─────────────────────────────────────
// AUTH
// ─────────────────────────────────────

router.post('/auth/adminLogin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email, password });
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

router.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/auth/adminLogin');
});

// ─────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────

router.get('/admin/dashboard', isAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({
            status: { $in: ['Preparing', 'Ready'] }
        });
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

// ─────────────────────────────────────
// ORDERS
// ─────────────────────────────────────

router.get('/admin/orders', isAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.render('admin/orders', { orders });
    } catch (err) {
        console.error(err);
        res.render('admin/orders', { orders: [] });
    }
});

router.post('/admin/orders/:id/status', isAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        const io = req.app.get('io');
        io.emit(`order-status-${order.token}`, { status });
        res.json({ success: true, status: order.status });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// ─────────────────────────────────────
// MENU MANAGEMENT
// ─────────────────────────────────────

// GET /admin/menu — show all menu items
router.get('/admin/menu', isAdmin, async (req, res) => {
    try {
        const menuItems = await Menu.find().sort({ category: 1 });
        res.render('admin/menu', { menuItems });
    } catch (err) {
        console.error(err);
        res.render('admin/menu', { menuItems: [] });
    }
});

// POST /admin/menu/add — add new menu item
router.post('/admin/menu/add', isAdmin, async (req, res) => {
    const { itemName, description, price, category, image } = req.body;
    try {
        await Menu.create({
            itemName,
            description,
            price: Number(price),
            category,
            image: image || undefined, // falls back to schema default if empty
            isAvailable: true
        });
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/menu');
    }
});

// POST /admin/menu/:id/edit — edit existing menu item
router.post('/admin/menu/:id/edit', isAdmin, async (req, res) => {
    const { itemName, description, price, category, image } = req.body;
    try {
        await Menu.findByIdAndUpdate(req.params.id, {
            itemName,
            description,
            price: Number(price),
            category,
            image
        });
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/menu');
    }
});

// POST /admin/menu/:id/toggle — toggle isAvailable
router.post('/admin/menu/:id/toggle', isAdmin, async (req, res) => {
    try {
        const item = await Menu.findById(req.params.id);
        item.isAvailable = !item.isAvailable;
        await item.save();
        res.json({ success: true, isAvailable: item.isAvailable });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// POST /admin/menu/:id/delete — delete menu item
router.post('/admin/menu/:id/delete', isAdmin, async (req, res) => {
    try {
        await Menu.findByIdAndDelete(req.params.id);
        res.redirect('/admin/menu');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/menu');
    }
});

module.exports = router;