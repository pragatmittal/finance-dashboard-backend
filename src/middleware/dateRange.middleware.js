/**
 * Validates that dateFrom <= dateTo when both are provided.
 * Assumes query params were already ISO-validated (or will be parsed safely here).
 */
const validateDateRange = (req, res, next) => {
  const { dateFrom, dateTo } = req.query;
  if (!dateFrom || !dateTo) return next();

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return res.status(400).json({
      success: false,
      message: "dateFrom and dateTo must be valid ISO dates",
      requestId: req.requestId,
    });
  }

  if (from.getTime() > to.getTime()) {
    return res.status(400).json({
      success: false,
      message: "dateFrom must be less than or equal to dateTo",
      requestId: req.requestId,
    });
  }

  next();
};

module.exports = validateDateRange;

