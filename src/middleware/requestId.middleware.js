const crypto = require("crypto");

/**
 * Attaches a stable request id to req/res for easier debugging.
 * - Uses inbound X-Request-Id if provided (useful behind gateways)
 * - Otherwise generates a UUID
 */
const requestId = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming.trim().length > 0
      ? incoming.trim()
      : crypto.randomUUID();

  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};

module.exports = requestId;

