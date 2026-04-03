const express = require("express");
const { body } = require("express-validator");
const { register, login, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");

const router = express.Router();

// Validation rules
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2, max: 60 }).withMessage("Name must be 2-60 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(["viewer", "analyst", "admin"]).withMessage("Invalid role"),
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// POST /api/auth/register
router.post("/register", registerRules, validate, register);

// POST /api/auth/login
router.post("/login", loginRules, validate, login);

// GET /api/auth/me  — requires valid token
router.get("/me", authenticate, getMe);

module.exports = router;