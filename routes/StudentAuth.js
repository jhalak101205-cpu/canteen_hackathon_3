const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");
const Student = require("../modals/StudentSchema");

// Helper middleware to verify if a user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in first."
    });
}

// POST /api/auth/check-email
// Checks if the email is already registered to coordinate frontend modal routing (Login vs Register)
router.post("/check-email", async (req, res) => {
    console.log("\n================ [DEBUG] POST /check-email ROUTE HIT ================");
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const student = await Student.findOne({ email });
        const exists = !!student;
        console.log(`[DEBUG] Email check for ${email}: exists = ${exists}`);
        
        return res.json({
            success: true,
            exists
        });
    } catch (err) {
        console.error("❌ [DEBUG] check-email error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/auth/register
// Registers a new student, hashes password, saves to DB, and log in session
router.post("/register", async (req, res) => {
    console.log("\n================ [DEBUG] POST /register ROUTE HIT ================");
    try {
        const { email, password } = req.body;
        console.log("[DEBUG] Register Request Body:", { email, passwordExists: !!password });

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: "A student profile with this email already exists."
            });
        }

        // Hash password
        console.log("[DEBUG] Hashing student password using bcrypt...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new student
        const newStudent = await Student.create({
            email,
            password: hashedPassword,
            isVerified: true
        });
        console.log("✅ [DEBUG] New student created in database:", newStudent._id);

        // Log the user in programmatically via passport
        req.login(newStudent, (err) => {
            if (err) {
                console.error("❌ [DEBUG] req.login error on register:", err);
                return res.status(500).json({
                    success: false,
                    message: "Registration successful, but session login failed."
                });
            }

            console.log("[DEBUG] Passport session created on register successfully!");
            // Set legacy session variables
            req.session.studentId = newStudent._id;
            req.session.isStudent = true;
            req.session.studentName = "";

            return res.json({
                success: true,
                message: "Registration and login successful.",
                student: {
                    _id: newStudent._id,
                    email: newStudent.email,
                    name: ""
                }
            });
        });
    } catch (err) {
        console.error("❌ [DEBUG] Error inside /register route:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to register student profile.",
            error: err.message
        });
    }
});

// POST /api/auth/login
// Logs in student via LocalStrategy
router.post("/login", (req, res, next) => {
    console.log("\n================ [DEBUG] POST /login ROUTE HIT ================");
    passport.authenticate("local", (err, student, info) => {
        if (err) {
            console.error("❌ [DEBUG] Passport login error:", err);
            return res.status(500).json({ success: false, message: "Server login error" });
        }
        if (!student) {
            console.log("[DEBUG] Login failed: info.message =", info ? info.message : "Unauthorized");
            return res.status(401).json({
                success: false,
                message: info ? info.message : "Invalid email or password."
            });
        }

        req.login(student, (err) => {
            if (err) {
                console.error("❌ [DEBUG] req.login error on login:", err);
                return res.status(500).json({ success: false, message: "Session creation failed" });
            }

            console.log("✅ [DEBUG] Passport Login Successful! Student ID:", student._id);
            // Set legacy session properties for EJS menu compatibility
            req.session.studentId = student._id;
            req.session.isStudent = true;
            req.session.studentName = student.name || "";

            // If it's a standard form submit, redirect to menu. If AJAX, return JSON.
            if (req.headers["accept"] && req.headers["accept"].includes("application/json")) {
                return res.json({
                    success: true,
                    message: "Log in successful.",
                    student: {
                        _id: student._id,
                        email: student.email,
                        name: student.name
                    }
                });
            } else {
                return res.redirect("/student/menu");
            }
        });
    })(req, res, next);
});

// POST /api/auth/logout
// Terminate session and clear cookie
router.post("/logout", (req, res) => {
    console.log("\n================ [DEBUG] POST /logout ROUTE HIT ================");
    req.logout((err) => {
        if (err) {
            console.error("❌ [DEBUG] req.logout error:", err);
            return res.status(500).json({ success: false, message: "Logout failed" });
        }

        req.session.destroy((err) => {
            if (err) {
                console.error("❌ [DEBUG] req.session.destroy error:", err);
            }
            res.clearCookie("connect.sid");
            console.log("✅ [DEBUG] Logout successful! Session destroyed.");
            res.redirect("/");
        });
    });
});

// GET /api/auth/me
// Returns current logged-in profile details
router.get("/me", (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({
            success: true,
            user: {
                _id: req.user._id,
                email: req.user.email,
                name: req.user.name,
                role: req.user.role
            }
        });
    } else {
        return res.status(401).json({
            success: false,
            message: "Not authenticated"
        });
    }
});

// POST /student-auth/save-name (Also supports /api/auth/save-name)
// Updates full name on the student DB profile
router.post("/save-name", isAuthenticated, async (req, res) => {
    console.log("\n================ [DEBUG] POST /save-name ROUTE HIT ================");
    try {
        const { name } = req.body;
        console.log(`[DEBUG] Update Name Request for student ID: ${req.user._id} to name: ${name}`);

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        // Update name in DB
        const student = await Student.findByIdAndUpdate(
            req.user._id,
            { name },
            { new: true }
        );

        // Update name in session
        req.session.studentName = name;
        console.log("✅ [DEBUG] Student name updated successfully!");

        return res.json({
            success: true,
            message: "Name saved successfully",
            student
        });
    } catch (err) {
        console.error("❌ [DEBUG] Save name error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to save student name details.",
            error: err.message
        });
    }
});

// GET /student-auth/logout (Support legacy logout link redirect)
router.get("/logout", (req, res) => {
    console.log("\n================ [DEBUG] GET /logout (LEGACY) ROUTE HIT ================");
    req.logout((err) => {
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            res.redirect("/");
        });
    });
});

module.exports = router;
