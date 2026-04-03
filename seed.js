/**
 * Seed script — creates sample users and financial records for development/testing.
 * Run: npm run seed
 *
 * WARNING: This drops existing users and records before inserting fresh data.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { User } = require("../models/user.model");
const { Record, CATEGORIES } = require("../models/record.model");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/finance_dashboard";

const users = [
  { name: "Super Admin", email: "admin@finance.dev", password: "admin123", role: "admin" },
  { name: "Alice Analyst", email: "analyst@finance.dev", password: "analyst123", role: "analyst" },
  { name: "Victor Viewer", email: "viewer@finance.dev", password: "viewer123", role: "viewer" },
];

const generateRecords = (adminId) => {
  const types = ["income", "expense"];
  const records = [];

  // Generate 60 records across the last 12 months
  for (let i = 0; i < 60; i++) {
    const type = types[i % 2];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 365));

    const incomeCategories = ["salary", "freelance", "investment", "rental", "business"];
    const expenseCategories = ["food", "transport", "utilities", "healthcare", "entertainment", "shopping", "travel"];

    const category =
      type === "income"
        ? incomeCategories[Math.floor(Math.random() * incomeCategories.length)]
        : expenseCategories[Math.floor(Math.random() * expenseCategories.length)];

    records.push({
      amount: parseFloat((Math.random() * 4900 + 100).toFixed(2)),
      type,
      category,
      date,
      description: `Sample ${type} record #${i + 1}`,
      createdBy: adminId,
    });
  }

  return records;
};

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await User.deleteMany({});
    await Record.deleteMany({});
    console.log("Cleared existing data");

    // Create users
    const createdUsers = await User.create(users);
    const admin = createdUsers.find((u) => u.role === "admin");
    console.log(`Created ${createdUsers.length} users`);

    // Credentials summary
    console.log("\n--- Seed Credentials ---");
    createdUsers.forEach((u) => {
      const original = users.find((s) => s.email === u.email);
      console.log(`[${u.role.toUpperCase()}] ${u.email} / ${original.password}`);
    });

    // Create records
    const records = generateRecords(admin._id);
    await Record.insertMany(records);
    console.log(`\nCreated ${records.length} financial records`);

    console.log("\nSeeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
};

seed();