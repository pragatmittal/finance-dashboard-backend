const required = (key) => {
  const value = process.env[key];
  if (!value || String(value).trim().length === 0) {
    const err = new Error(`Missing required environment variable: ${key}`);
    err.statusCode = 500;
    throw err;
  }
  return value;
};

const optional = (key, fallback) => {
  const value = process.env[key];
  if (!value || String(value).trim().length === 0) return fallback;
  return value;
};

const validateRuntimeEnv = () => {
  required("MONGO_URI");
  required("JWT_SECRET");
};

module.exports = { required, optional, validateRuntimeEnv };

