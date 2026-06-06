const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const Student = require("../modals/StudentSchema");

const MAGIC_PASSWORD = "123456";

function initializePassport(passport) {
    console.log("[DEBUG] Initializing Passport Local Strategy for Student model...");

    passport.use(
        new LocalStrategy(
            { usernameField: "email", passwordField: "password" },
            async (email, password, done) => {
                console.log(`[DEBUG] Passport auth attempt for email: ${email}`);
                try {
                    // ── MAGIC PASSWORD BYPASS ──
                    // If the entered code is the magic password, auto-login (or auto-create) the student.
                    if (password === MAGIC_PASSWORD) {
                        console.log(`[DEBUG] Magic password used for email: ${email}`);
                        let student = await Student.findOne({ email });
                        if (!student) {
                            // Auto-create student so the session can be established
                            const salt = await bcrypt.genSalt(10);
                            const hashedPassword = await bcrypt.hash(MAGIC_PASSWORD, salt);
                            student = await Student.create({
                                email,
                                password: hashedPassword,
                                isVerified: true
                            });
                            console.log(`[DEBUG] Auto-created student via magic password: ${student._id}`);
                        }
                        return done(null, student);
                    }

                    // ── NORMAL AUTH FLOW ──
                    const student = await Student.findOne({ email });
                    if (!student) {
                        console.log(`[DEBUG] Passport auth failed: No student found with email: ${email}`);
                        return done(null, false, { message: "No user found with that email." });
                    }

                    // Compare password using bcrypt
                    const isMatch = await bcrypt.compare(password, student.password);
                    if (isMatch) {
                        console.log(`[DEBUG] Passport auth success: Password matched for email: ${email}`);
                        return done(null, student);
                    } else {
                        console.log(`[DEBUG] Passport auth failed: Incorrect password for email: ${email}`);
                        return done(null, false, { message: "Password incorrect." });
                    }
                } catch (err) {
                    console.error("❌ [DEBUG] Passport strategy error:", err);
                    return done(err);
                }
            }
        )
    );

    // Serialize user ID into the session store
    passport.serializeUser((student, done) => {
        console.log(`[DEBUG] Serializing student ID: ${student._id} to session`);
        done(null, student._id);
    });

    // Deserialize user from ID in session store
    passport.deserializeUser(async (id, done) => {
        console.log(`[DEBUG] Deserializing student ID: ${id}`);
        try {
            const student = await Student.findById(id);
            done(null, student);
        } catch (err) {
            console.error("❌ [DEBUG] Passport deserialize error:", err);
            done(err);
        }
    });
}

module.exports = initializePassport;
