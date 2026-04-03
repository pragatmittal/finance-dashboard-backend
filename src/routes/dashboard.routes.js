const express = require("express");
const { query } = require("express-validator");
const {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentActivity,
  getWeeklyTrend,
} = require("../controllers/dashboard.controller");
const {
  authenticate,
  isAnyRole,
  isAnalystOrAdmin,
} = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const validateDateRange = require("../middleware/dateRange.middleware");

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

const dateRangeRules = [
  query("dateFrom").optional().isISO8601().withMessage("dateFrom must be a valid ISO date"),
  query("dateTo").optional().isISO8601().withMessage("dateTo must be a valid ISO date"),
];

// GET /api/dashboard/summary  — all roles
router.get("/summary", isAnyRole, dateRangeRules, validate, validateDateRange, getSummary);

// GET /api/dashboard/category-breakdown  — all roles
router.get(
  "/category-breakdown",
  isAnyRole,
  [
    ...dateRangeRules,
    query("type").optional().isIn(["income", "expense"]).withMessage("Type must be income or expense"),
  ],
  validate,
  validateDateRange,
  getCategoryBreakdown
);

// GET /api/dashboard/monthly-trend  — all roles
router.get(
  "/monthly-trend",
  isAnyRole,
  [query("months").optional().isInt({ min: 1, max: 24 }).withMessage("months must be 1-24")],
  validate,
  getMonthlyTrend
);

// GET /api/dashboard/recent  — all roles
router.get(
  "/recent",
  isAnyRole,
  [query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("limit must be 1-50")],
  validate,
  getRecentActivity
);

// GET /api/dashboard/weekly-trend  — analyst and admin only (granular data)
router.get("/weekly-trend", isAnalystOrAdmin, getWeeklyTrend);

module.exports = router;