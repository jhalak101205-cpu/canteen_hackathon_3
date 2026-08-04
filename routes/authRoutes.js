const express = require("express");
const router = express.Router();

router.get("/studentLogin", (req, res) => {
  res.redirect("/sign-in");
});

router.post("/studentLogin", (req, res) => {
  const { email, name } = req.body;
  req.session.isStudent = true;
  req.session.studentEmail = email || "student@canteen.com";
  req.session.studentName = name || (email ? email.split("@")[0] : "Student");
  res.redirect("/menu");
});

router.get("/adminLogin", (req, res) => {
  res.render("auth/adminLogin");
});

module.exports = router;
