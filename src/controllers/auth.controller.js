const jwt = require("jsonwebtoken");
const { User } = require("../models/user.model");

/**
 * Generates a signed JWT for the given user ID.
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

/**
 * POST /api/auth/register
 * Creates a new user account (defaults to 'viewer' role).
 * Only admins can assign higher roles — enforced at the route level.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // If a role is specified and the caller is not an admin, ignore it
    const assignedRole =
      req.user && req.user.role === "admin" ? role : undefined;

    const user = await User.create({
      name,
      email,
      password,
      ...(assignedRole && { role: assignedRole }),
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it has select: false in the schema
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact an admin.",
      });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, getMe };