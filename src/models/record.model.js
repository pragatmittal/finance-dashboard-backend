const mongoose = require("mongoose");

const RECORD_TYPES = Object.freeze({
  INCOME: "income",
  EXPENSE: "expense",
});

// Predefined categories for consistent filtering and grouping
const CATEGORIES = Object.freeze([
  "salary",
  "freelance",
  "investment",
  "rental",
  "business",
  "food",
  "transport",
  "utilities",
  "healthcare",
  "education",
  "entertainment",
  "shopping",
  "travel",
  "insurance",
  "taxes",
  "other",
]);

const recordSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: {
        values: Object.values(RECORD_TYPES),
        message: "Type must be either 'income' or 'expense'",
      },
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: CATEGORIES,
        message: `Category must be one of: ${CATEGORIES.join(", ")}`,
      },
      lowercase: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description cannot exceed 300 characters"],
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      // Soft delete — records are never hard-removed from the DB
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for common query patterns
recordSchema.index({ type: 1, category: 1, date: -1 });
recordSchema.index({ createdBy: 1, date: -1 });
recordSchema.index({ isDeleted: 1 });

// Auto-filter soft-deleted records for all standard queries
recordSchema.pre(/^find/, function (next) {
  // Allow bypassing this filter when explicitly querying deleted records
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const Record = mongoose.model("Record", recordSchema);

module.exports = { Record, RECORD_TYPES, CATEGORIES };