const { Record } = require("../models/record.model");

/**
 * Shared helper: builds a date range filter for the current month or a given range.
 */
const getDateFilter = (query) => {
  if (query.dateFrom || query.dateTo) {
    const dateFilter = {};
    if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
    if (query.dateTo) dateFilter.$lte = new Date(query.dateTo);
    return dateFilter;
  }
  return undefined;
};

/**
 * GET /api/dashboard/summary
 * Viewers, Analysts, Admins.
 * Returns: total income, total expenses, net balance, and record count.
 * Supports optional date range filtering.
 */
const getSummary = async (req, res, next) => {
  try {
    const dateFilter = getDateFilter(req.query);
    const matchStage = { isDeleted: false };
    if (dateFilter) matchStage.date = dateFilter;

    const result = await Record.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
          },
          totalExpenses: {
            $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
          },
          totalRecords: { $sum: 1 },
          incomeCount: {
            $sum: { $cond: [{ $eq: ["$type", "income"] }, 1, 0] },
          },
          expenseCount: {
            $sum: { $cond: [{ $eq: ["$type", "expense"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: { $round: ["$totalIncome", 2] },
          totalExpenses: { $round: ["$totalExpenses", 2] },
          netBalance: {
            $round: [{ $subtract: ["$totalIncome", "$totalExpenses"] }, 2],
          },
          totalRecords: 1,
          incomeCount: 1,
          expenseCount: 1,
        },
      },
    ]);

    const summary = result[0] || {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      totalRecords: 0,
      incomeCount: 0,
      expenseCount: 0,
    };

    res.json({ success: true, summary });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/category-breakdown
 * Viewers, Analysts, Admins.
 * Returns income and expense totals grouped by category.
 */
const getCategoryBreakdown = async (req, res, next) => {
  try {
    const dateFilter = getDateFilter(req.query);
    const matchStage = { isDeleted: false };
    if (dateFilter) matchStage.date = dateFilter;
    if (req.query.type) matchStage.type = req.query.type;

    const breakdown = await Record.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { category: "$category", type: "$type" },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.category",
          entries: {
            $push: {
              type: "$_id.type",
              total: { $round: ["$total", 2] },
              count: "$count",
            },
          },
          categoryTotal: { $sum: "$total" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          entries: 1,
          categoryTotal: { $round: ["$categoryTotal", 2] },
        },
      },
      { $sort: { categoryTotal: -1 } },
    ]);

    res.json({ success: true, breakdown });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/monthly-trend
 * Viewers, Analysts, Admins.
 * Returns monthly income vs expense totals for the past N months.
 * Default: last 12 months. Configurable with ?months=6
 */
const getMonthlyTrend = async (req, res, next) => {
  try {
    const months = Math.min(24, Math.max(1, parseInt(req.query.months) || 12));
    const from = new Date();
    from.setMonth(from.getMonth() - months + 1);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);

    const trend = await Record.aggregate([
      { $match: { isDeleted: false, date: { $gte: from } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          data: {
            $push: {
              type: "$_id.type",
              total: { $round: ["$total", 2] },
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          // Label like "2024-06" for easy frontend charting
          label: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
            ],
          },
          data: 1,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    res.json({ success: true, months, trend });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/recent
 * Viewers, Analysts, Admins.
 * Returns the N most recent records. Default: 10. Max: 50.
 */
const getRecentActivity = async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    const records = await Record.find()
      .sort({ date: -1 })
      .limit(limit)
      .populate("createdBy", "name email");

    res.json({ success: true, records });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/weekly-trend
 * Analysts, Admins.
 * Returns daily income/expense totals for the past 7 days.
 */
const getWeeklyTrend = async (req, res, next) => {
  try {
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    const trend = await Record.aggregate([
      { $match: { isDeleted: false, date: { $gte: from } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          data: {
            $push: {
              type: "$_id.type",
              total: { $round: ["$total", 2] },
              count: "$count",
            },
          },
        },
      },
      { $project: { _id: 0, date: "$_id", data: 1 } },
      { $sort: { date: 1 } },
    ]);

    res.json({ success: true, trend });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentActivity,
  getWeeklyTrend,
};