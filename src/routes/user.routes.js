const express = require("express");
const { body, param, query } = require("express-validator");
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} = require("../controllers/user.controller");
const { authenticate, isAdmin } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");

const router = express.Router();

// All user management routes require authentication + admin role
router.use(authenticate, isAdmin);

// GET /api/users  — list all users with optional filters
router.get(
  "/",
  [
    query("role").optional().isIn(["viewer", "analyst", "admin"]).withMessage("Invalid role filter"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
  ],
  validate,
  getAllUsers
);

// GET /api/users/:id  — get specific user
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validate,
  getUserById
);

// PATCH /api/users/:id/role  — update role
router.patch(
  "/:id/role",
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("role").isIn(["viewer", "analyst", "admin"]).withMessage("Role must be: viewer, analyst, or admin"),
  ],
  validate,
  updateUserRole
);

// PATCH /api/users/:id/status  — activate/deactivate
router.patch(
  "/:id/status",
  [
    param("id").isMongoId().withMessage("Invalid user ID"),
    body("isActive").isBoolean().withMessage("isActive must be true or false"),
  ],
  validate,
  updateUserStatus
);

// DELETE /api/users/:id  — delete user
router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid user ID")],
  validate,
  deleteUser
);

module.exports = router;