require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Passport & sessions
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const { MongoStore } = require("connect-mongo");
const initializePassport = require("./config/passport");
initializePassport(passport);

// Routes
const studentAuthRoutes = require("./routes/StudentAuth");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const paymentRoutes = require("./routes/payment");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    secret: process.env.SESSION_SECRET || "canteen-passport-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: "mongodb://127.0.0.1:27017/canteenApp",
        collectionName: "sessions"
    }),
    cookie: {
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10), // 1 day
        secure: false
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Expose session variables and user details to all EJS templates
app.use((req, res, next) => {
    if (req.isAuthenticated() && req.user) {
        req.session.studentId = req.user._id;
        req.session.isStudent = true;
        req.session.studentName = req.user.name || "";
    }
    res.locals.session = req.session || {};
    res.locals.user = req.user || null;
    next();
});

// Make io available in routes
app.set("io", io);

// Auth API routes (Passport-based login/register)
app.use("/student-auth", studentAuthRoutes);
app.use("/api/auth", studentAuthRoutes);

// Page routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);
app.use("/api/payment", paymentRoutes);

// Home page
app.get("/", (req, res) => {
    res.render("home");
});

// Database connection
mongoose.connect("mongodb://127.0.0.1:27017/canteenApp")
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.log("MongoDB connection warning (you can still run the frontend):", err.message);
    });

// Socket connection for real-time order updates
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

const port = 3000;
server.listen(port, () => {
    console.log(`Canteen Express server running at http://localhost:${port}`);
});