const { User, ROLES } = require("../models/user.model");

/**
 * GET /api/users
 * Admin only — list all users with optional pagination.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:id
 * Admin only — get a single user by ID.
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/role
 * Admin only — update another user's role.
 * An admin cannot demote their own account to prevent lockout.
 */
const updateUserRole = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Admins cannot change their own role.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, message: "Role updated successfully.", user });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/:id/status
 * Admin only — activate or deactivate a user.
 * Cannot deactivate your own account.
 */
const updateUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own active status.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully.`,
      user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:id
 * Admin only — permanently delete a user.
 * Cannot delete your own account.
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, message: "User deleted successfully." });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};