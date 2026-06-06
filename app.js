const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

// Route imports
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

// Make io available in routes
app.set("io", io);

// Database connection
mongoose
  .connect("mongodb://127.0.0.1:27017/canteenApp")
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log(
      "MongoDB connection warning (you can still run the frontend):",
      err.message
    );
  });

/* API Routes */
app.use("/api/payment", paymentRoutes);

/* Page Routes */

// Home page
app.get("/", (req, res) => {
  res.render("home");
});

// Authentication routes
app.get("/auth/studentLogin", (req, res) => {
  res.render("auth/studentLogin");
});

app.get("/auth/adminLogin", (req, res) => {
  res.render("auth/adminLogin");
});

// Student flow routes
app.get("/student/menu", (req, res) => {
  res.render("student/menu");
});

app.get("/student/cart", (req, res) => {
  res.render("student/cart");
});

app.get("/student/payment", (req, res) => {
  res.render("student/payment");
});

app.get("/student/success", (req, res) => {
  res.render("student/success");
});

// Admin flow routes
app.get("/admin/dashboard", (req, res) => {
  res.render("admin/dashboard");
});

app.get("/admin/orders", (req, res) => {
  res.render("admin/orders");
});

/* Socket connection for real-time order updates */
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