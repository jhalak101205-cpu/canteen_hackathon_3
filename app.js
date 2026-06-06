const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');
const seedMenuItems = require('./seed');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'canteen-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 hours
}));

// Make io available in routes
app.set('io', io);

// Database connection
mongoose.connect('mongodb://127.0.0.1:27017/canteenApp')
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => console.log('MongoDB connection warning:', err.message));

// Page Routes
app.get('/', (req, res) => res.render('home'));
app.get('/auth/studentLogin', (req, res) => res.render('auth/studentLogin'));
app.get('/auth/adminLogin', (req, res) => res.render('auth/adminLogin'));

// Mount routes
app.use('/student', studentRoutes);
app.use('/', adminRoutes);

// seedMenuItems(); // uncomment to seed DB

// Socket connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('disconnect', () => console.log('User disconnected:', socket.id));
});

const port = 3000;
server.listen(port, () => {
    console.log(`Canteen Express server running at http://localhost:${port}`);
});