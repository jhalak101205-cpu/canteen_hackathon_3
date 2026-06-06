const express = require("express");
const router = express.Router();

router.get("/studentLogin", (req, res) => {
  res.render("auth/studentLogin");
});

router.get("/adminLogin", (req, res) => {
  res.render("auth/adminLogin");
});

module.exports = router;
