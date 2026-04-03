const { Record } = require("../models/record.model");

/**
 * Builds the MongoDB query filter from request query params.
 * Supports: type, category, dateFrom, dateTo, search (description)
 */
const buildFilter = (query) => {
  const filter = {};

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;

  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }

  if (query.search) {
    filter.description = { $regex: query.search, $options: "i" };
  }

  return filter;
};

/**
 * GET /api/records
 * Viewers, Analysts, Admins — list records with filters and pagination.
 */
const getAllRecords = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = buildFilter(req.query);
    const activeFilter = { ...filter, isDeleted: false };

    // Sort: newest first by default; allow sorting by amount
    const sortField = req.query.sortBy === "amount" ? "amount" : "date";
    const sortOrder = req.query.order === "asc" ? 1 : -1;

    const [records, total] = await Promise.all([
      Record.find(activeFilter)
        .populate("createdBy", "name email role")
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      Record.countDocuments(activeFilter),
    ]);

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      records,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/records/:id
 * Viewers, Analysts, Admins — get a single record.
 */
const getRecordById = async (req, res, next) => {
  try {
    const record = await Record.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    res.json({ success: true, record });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/records
 * Analysts, Admins — create a new financial record.
 */
const createRecord = async (req, res, next) => {
  try {
    const { amount, type, category, date, description } = req.body;

    const record = await Record.create({
      amount,
      type,
      category,
      date: date || new Date(),
      description,
      createdBy: req.user._id,
    });

    await record.populate("createdBy", "name email role");

    res.status(201).json({
      success: true,
      message: "Record created successfully.",
      record,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/records/:id
 * Admins only — update an existing record.
 * Only the fields provided in the body are updated (partial update).
 */
const updateRecord = async (req, res, next) => {
  try {
    const allowedUpdates = ["amount", "type", "category", "date", "description"];
    const updates = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const record = await Record.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email role");

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    res.json({ success: true, message: "Record updated successfully.", record });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/records/:id
 * Admins only — soft delete a record (sets isDeleted=true, records deletedAt timestamp).
 * Records are never hard-removed; this keeps an audit trail intact.
 */
const deleteRecord = async (req, res, next) => {
  try {
    const record = await Record.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    res.json({
      success: true,
      message: "Record deleted successfully (soft delete).",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
};
