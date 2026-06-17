const express = require("express");
const router = express.Router();

// Redirect legacy student paths to clean root paths protected by Clerk
router.get("/menu", (req, res) => res.redirect("/menu"));
router.get("/cart", (req, res) => res.redirect("/cart"));
router.get("/payment", (req, res) => res.redirect("/payment"));
router.get("/success", (req, res) => res.redirect("/success"));

module.exports = router;