const express = require("express");
const { body, param, query } = require("express-validator");
const {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} = require("../controllers/record.controller");
const {
  authenticate,
  isAdmin,
  isAnalystOrAdmin,
  isAnyRole,
} = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const validateDateRange = require("../middleware/dateRange.middleware");
const { CATEGORIES, RECORD_TYPES } = require("../models/record.model");

const router = express.Router();

// All record routes require authentication
router.use(authenticate);

const validTypes = Object.values(RECORD_TYPES);
const validCategories = CATEGORIES;

// Shared validation for list queries
const listQueryRules = [
  query("type").optional().isIn(validTypes).withMessage(`Type must be: ${validTypes.join(" or ")}`),
  query("category").optional().isIn(validCategories).withMessage("Invalid category"),
  query("dateFrom").optional().isISO8601().withMessage("dateFrom must be a valid ISO date"),
  query("dateTo").optional().isISO8601().withMessage("dateTo must be a valid ISO date"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
  query("sortBy").optional().isIn(["date", "amount"]).withMessage("sortBy must be date or amount"),
  query("order").optional().isIn(["asc", "desc"]).withMessage("order must be asc or desc"),
];

// Record body validation (for create and update)
const recordBodyRules = [
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
  body("type").isIn(validTypes).withMessage(`Type must be: ${validTypes.join(" or ")}`),
  body("category").isIn(validCategories).withMessage(`Category must be one of: ${validCategories.join(", ")}`),
  body("date").optional().isISO8601().withMessage("Date must be a valid ISO date"),
  body("description").optional().isLength({ max: 300 }).withMessage("Description max 300 characters"),
];

const updateBodyRules = [
  body("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be a positive number"),
  body("type").optional().isIn(validTypes).withMessage(`Type must be: ${validTypes.join(" or ")}`),
  body("category").optional().isIn(validCategories).withMessage(`Category must be one of: ${validCategories.join(", ")}`),
  body("date").optional().isISO8601().withMessage("Date must be a valid ISO date"),
  body("description").optional().isLength({ max: 300 }).withMessage("Description max 300 characters"),
];

// GET /api/records  — all authenticated users can view records
router.get("/", isAnyRole, listQueryRules, validate, validateDateRange, getAllRecords);

// GET /api/records/:id  — all authenticated users
router.get(
  "/:id",
  isAnyRole,
  [param("id").isMongoId().withMessage("Invalid record ID")],
  validate,
  getRecordById
);

// POST /api/records  — analyst and admin only
router.post("/", isAnalystOrAdmin, recordBodyRules, validate, createRecord);

// PATCH /api/records/:id  — admin only
router.patch(
  "/:id",
  isAdmin,
  [param("id").isMongoId().withMessage("Invalid record ID"), ...updateBodyRules],
  validate,
  updateRecord
);

// DELETE /api/records/:id  — admin only (soft delete)
router.delete(
  "/:id",
  isAdmin,
  [param("id").isMongoId().withMessage("Invalid record ID")],
  validate,
  deleteRecord
);

module.exports = router;