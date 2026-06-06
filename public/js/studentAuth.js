/**
 * Student Authentication Flow Handler (Passport.js Version)
 * Manage modal step transitions, API requests for login/register, and user state preservation.
 */

document.addEventListener("DOMContentLoaded", () => {
    const authOverlay = document.getElementById("student-auth-overlay");
    if (!authOverlay) return; // Student already authenticated or modal not rendered

    // DOM Elements
    const stepEmail = document.getElementById("auth-step-email");
    const stepOtp = document.getElementById("auth-step-otp");
    const stepName = document.getElementById("auth-step-name");
    
    const emailInput = document.getElementById("auth-email");
    const otpInput = document.getElementById("auth-otp");
    const nameInput = document.getElementById("auth-name");
    
    const btnSendOtp = document.getElementById("btn-send-otp");
    const btnVerifyOtp = document.getElementById("btn-verify-otp");
    const btnSaveName = document.getElementById("btn-save-name");
    const btnResendOtp = document.getElementById("btn-resend-otp");
    
    const alertContainer = document.getElementById("auth-alert");

    // Add blurred body class for visual focus
    document.body.classList.add("modal-active");

    // State Variables
    let isNewUser = false;
    let savedEmail = "";

    /**
     * Display a temporary/permanent feedback alert in the modal
     * @param {string} msg - The message content
     * @param {boolean} isSuccess - True for success (green), false for error (red)
     */
    function showAlert(msg, isSuccess = false) {
        alertContainer.innerText = msg;
        alertContainer.className = `auth-alert ${isSuccess ? "success" : "error"}`;
        alertContainer.style.display = "block";
    }

    /**
     * Clear active alerts
     */
    function hideAlert() {
        alertContainer.style.display = "none";
        alertContainer.innerText = "";
        alertContainer.className = "auth-alert";
    }

    /**
     * Set a button to its disabled/processing state
     */
    function setBtnLoading(btn, text = "Processing...") {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerText;
        btn.innerText = text;
        btn.style.opacity = "0.7";
        btn.style.cursor = "not-allowed";
    }

    /**
     * Restore a button to its active/original state
     */
    function clearBtnLoading(btn) {
        btn.disabled = false;
        btn.innerText = btn.dataset.originalText || btn.innerText;
        btn.style.opacity = "";
        btn.style.cursor = "";
    }

    /**
     * STEP 1: Email collection
     * Check if user is registered or new, then transition to Step 2
     */
    async function sendOtp(e) {
        if (e) e.preventDefault();
        hideAlert();

        const email = emailInput.value.trim();
        if (!email) {
            showAlert("Please enter a valid email address.");
            return;
        }

        // Quick email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert("Please enter a correctly formatted email address.");
            return;
        }

        setBtnLoading(btnSendOtp, "Sending OTP... 📩");
        if (btnResendOtp) setBtnLoading(btnResendOtp, "Sending...");

        try {
            console.log("[DEBUG] Checking email status via API...");
            const response = await fetch("/api/auth/check-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                savedEmail = email;
                isNewUser = !data.exists;
                console.log(`[DEBUG] Email check complete. isNewUser: ${isNewUser}`);

                // Visual Match: show success message identical to original flow
                showAlert("Email found! Enter your password below.", true);
                
                // Show Step 2 (labeled OTP in HTML, but maps to password/PIN)
                stepEmail.style.display = "none";
                stepOtp.style.display = "flex";
                otpInput.focus();
            } else {
                showAlert(data.message || "An error occurred checking email registration.");
            }
        } catch (error) {
            console.error("❌ [DEBUG] check-email error:", error);
            showAlert("Connection error. Could not connect to authentication server.");
        } finally {
            clearBtnLoading(btnSendOtp);
            if (btnResendOtp) clearBtnLoading(btnResendOtp);
        }
    }

    btnSendOtp.addEventListener("click", sendOtp);
    if (btnResendOtp) {
        btnResendOtp.addEventListener("click", sendOtp);
    }

    /**
     * STEP 2: Password/PIN Verification
     * Authenticate via /login or register via /register
     */
    async function verifyOtp(e) {
        if (e) e.preventDefault();
        hideAlert();

        const code = otpInput.value.trim();
        if (!code) {
            showAlert("Please enter your PIN/password code.");
            return;
        }

        setBtnLoading(btnVerifyOtp, isNewUser ? "Creating account... 📝" : "Logging in... 🔑");

        try {
            const url = isNewUser ? "/api/auth/register" : "/api/auth/login";
            console.log(`[DEBUG] Attempting credentials request to ${url}...`);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ email: savedEmail, password: code })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert(isNewUser ? "Account created! What's your name?" : "Welcome back!", true);

                if (isNewUser) {
                    // Show Step 3 (collect Name)
                    stepOtp.style.display = "none";
                    stepName.style.display = "flex";
                    nameInput.focus();
                } else {
                    // Success: close modal and reload
                    closeAuthModal();
                }
            } else {
                showAlert(data.message || "Invalid credentials. Please verify and try again.");
            }
        } catch (error) {
            console.error("❌ [DEBUG] auth response error:", error);
            showAlert("Connection error. Authentication failed.");
        } finally {
            clearBtnLoading(btnVerifyOtp);
        }
    }

    btnVerifyOtp.addEventListener("click", verifyOtp);

    /**
     * STEP 3: Save Name handler
     */
    async function saveName(e) {
        if (e) e.preventDefault();
        hideAlert();

        const name = nameInput.value.trim();
        if (!name) {
            showAlert("Please enter your name to proceed.");
            return;
        }

        setBtnLoading(btnSaveName, "Saving details... 📝");

        try {
            const response = await fetch("/student-auth/save-name", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (data.success) {
                closeAuthModal();
            } else {
                showAlert(data.message || "Failed to save details. Please try again.");
            }
        } catch (error) {
            console.error("❌ [DEBUG] Error saving name:", error);
            showAlert("Connection error. Could not save your name.");
        } finally {
            clearBtnLoading(btnSaveName);
        }
    }

    btnSaveName.addEventListener("click", saveName);

    /**
     * Finish verification: close overlay and enable screen controls
     */
    function closeAuthModal() {
        document.body.classList.remove("modal-active");
        
        // Modal fade-out animation
        authOverlay.style.transition = "opacity 0.3s ease";
        authOverlay.style.opacity = "0";
        
        setTimeout(() => {
            authOverlay.style.display = "none";
            authOverlay.remove(); // Remove from DOM completely
            // Reload page to refresh state (e.g., navbar logout / user header status)
            window.location.reload();
        }, 300);
    }
});
