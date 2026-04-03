const { validationResult } = require("express-validator");
const { CATEGORIES } = require("../models/record.model");

/**
 * Runs after express-validator chains.
 * If any validation failed, returns a clean 400 with all errors listed.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { validate };