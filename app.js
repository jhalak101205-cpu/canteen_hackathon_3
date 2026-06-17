require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenAI } = require("@google/genai");

// Clerk
const {
    clerkMiddleware,
    requireAuth,
    getAuth,
    clerkClient,
} = require("@clerk/express");

// Sessions (kept for admin auth + syncing student data after Clerk verify)
const session = require("express-session");
const cookieParser = require("cookie-parser");
const { MongoStore } = require("connect-mongo");

// AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Models
const Student = require("./modals/StudentSchema");
const StudentMenu = require("./modals/studentMenu");

// Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const paymentRoutes = require("./routes/payment");

// ─────────────────────────────────────
// APP SETUP
// ─────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Sessions (used for admin + storing synced student info locally)
app.use(
    session({
        secret: process.env.SESSION_SECRET || "canteen-secret",
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: "mongodb://127.0.0.1:27017/canteenApp",
            collectionName: "sessions",
        }),
        cookie: {
            httpOnly: true,
            maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10),
            secure: false,
        },
    })
);

// Clerk middleware — must come after session
app.use(clerkMiddleware());

// Pass Clerk publishable key and session to all EJS templates
app.use((req, res, next) => {
    res.locals.clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    res.locals.session = req.session || {};
    res.locals.user = null;
    next();
});

// Make io available in routes
app.set("io", io);

// ─────────────────────────────────────
// CLERK USER SYNC HELPER
// ─────────────────────────────────────
async function syncStudent(req) {
    try {
        const { userId } = getAuth(req);
        if (!userId) return null;

        const clerkUser = await clerkClient.users.getUser(userId);

        const email =
            clerkUser.emailAddresses.find(
                (e) => e.id === clerkUser.primaryEmailAddressId
            )?.emailAddress || "";

        const name =
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

        const student = await Student.findOneAndUpdate(
            { clerkId: userId },
            { clerkId: userId, email, name },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Populate Express session for EJS templates
        req.session.studentId = student._id;
        req.session.isStudent = true;
        req.session.studentName = student.name || "";
        req.session.studentEmail = student.email || "";

        console.log("Clerk user synced:", student.email);
        return student;
    } catch (err) {
        console.error("syncStudent error:", err.message);
        return null;
    }
}

// Home page
app.get("/", (req, res) => {
    res.render("home");
});

// Clerk sign-in / sign-up pages
app.get("/sign-in", (req, res) => {
    res.render("auth/signIn");
});

app.get("/sign-up", (req, res) => {
    res.render("auth/signUp");
});

// Logout — destroy local session, Clerk handles its own token on the client
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.redirect("/");
    });
});

// ─────────────────────────────────────
// PROTECTED STUDENT ROUTES
// ─────────────────────────────────────

app.get("/menu", requireAuth({ signInUrl: "/sign-in" }), async (req, res) => {
    try {
        await syncStudent(req);
        const menuItems = await StudentMenu.find({ isAvailable: true });
        res.render("student/menu", { menuItems });
    } catch (err) {
        console.error("Menu error:", err);
        res.status(500).send("Error loading menu");
    }
});

app.get("/cart", requireAuth({ signInUrl: "/sign-in" }), async (req, res) => {
    try {
        await syncStudent(req);
        res.render("student/cart");
    } catch (err) {
        console.error("Cart error:", err);
        res.status(500).send("Error loading cart");
    }
});

app.get("/payment", requireAuth({ signInUrl: "/sign-in" }), async (req, res) => {
    try {
        await syncStudent(req);
        res.render("student/payment");
    } catch (err) {
        console.error("Payment error:", err);
        res.status(500).send("Error loading payment");
    }
});

app.get("/success", requireAuth({ signInUrl: "/sign-in" }), async (req, res) => {
    try {
        await syncStudent(req);
        res.render("student/success");
    } catch (err) {
        console.error("Success error:", err);
        res.status(500).send("Error loading success page");
    }
});

// ─────────────────────────────────────
// FOOD HEALTH AI ROUTE
// ─────────────────────────────────────
app.post("/api/food-health", async (req, res) => {
    try {
        const { name, category } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Food name is required" });
        }

        const prompt = `
You are a nutrition assistant for a college canteen app.

Food item: ${name}
Category: ${category || "Canteen Item"}

Return ONLY valid JSON in this format:
{
  "calories": "approx calories per serving",
  "healthLevel": "Healthy / Moderate / Unhealthy",
  "reason": "short reason in simple words"
}
`;

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: prompt,
        });

        let text = response.text.trim();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(text);

        res.json({ success: true, data: result });
    } catch (error) {
        console.log("Gemini food health error:", error.message);
        res.status(500).json({ success: false, message: "Could not analyze food health" });
    }
});

// ─────────────────────────────────────
// MOUNTED ROUTERS
// ─────────────────────────────────────
app.use("/auth", authRoutes);         // /auth/adminLogin, /auth/studentLogin (redirects)
app.use("/", adminRoutes);             // /admin/dashboard, /admin/orders, etc.
app.use("/student", studentRoutes);    // /student/* → redirect to clean routes
app.use("/api/payment", paymentRoutes);

// ─────────────────────────────────────
// DATABASE
// ─────────────────────────────────────
mongoose
    .connect("mongodb://127.0.0.1:27017/canteenApp")
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((err) => {
        console.log("MongoDB connection warning (you can still run the frontend):", err.message);
    });

// ─────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// ─────────────────────────────────────
// START SERVER
// ─────────────────────────────────────
const port = 3000;
server.listen(port, () => {
    console.log(`Canteen Express server running at http://localhost:${port}`);
});