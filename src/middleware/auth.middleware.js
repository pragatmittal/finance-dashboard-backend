const jwt = require("jsonwebtoken");
const { User, ROLES } = require("../models/user.model");

/**
 * Verifies the JWT token from the Authorization header.
 * Attaches the authenticated user to req.user on success.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists." });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact an admin.",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    }
    next(err);
  }
};

/**
 * Role-based access control factory.
 * Usage: authorize("admin") or authorize("admin", "analyst")
 *
 * Role hierarchy: admin > analyst > viewer
 * If no roles are passed, only checks that user is authenticated.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(" or ")}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

// Convenience role checks for cleaner route definitions
const isAdmin = authorize(ROLES.ADMIN);
const isAnalystOrAdmin = authorize(ROLES.ANALYST, ROLES.ADMIN);
const isAnyRole = authorize(ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN);

module.exports = { authenticate, authorize, isAdmin, isAnalystOrAdmin, isAnyRole };