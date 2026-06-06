const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");

// Routes
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
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "canteen_secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Make io available in routes
app.set("io", io);

// Database connection
mongoose
  .connect("mongodb://127.0.0.1:27017/canteenApp")
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log("MongoDB connection warning:", err.message);
  });

// Home page
app.get("/", (req, res) => {
  res.render("home");
});

// Route connections
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/student", studentRoutes);

// Your payment API route
app.use("/api/payment", paymentRoutes);

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