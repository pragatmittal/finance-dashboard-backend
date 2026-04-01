require("dotenv").config();

const app = require("./app");
const connectDB = require("./utils/db");
const mongoose = require("mongoose");
const { validateRuntimeEnv } = require("./utils/env");

const PORT = process.env.PORT || 3000;

const start = async () => {
  validateRuntimeEnv();
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Set PORT in .env or stop the other process.`);
      process.exit(1);
    }
    console.error(err);
    process.exit(1);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down...`);
    server.close(async () => {
      try {
        await mongoose.disconnect();
      } finally {
        process.exit(0);
      }
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

start();

