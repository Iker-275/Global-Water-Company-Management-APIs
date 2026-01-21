const getPeriodRange = (billingPeriod) => {
  const [year, month] = billingPeriod.split("-").map(Number);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { start, end };
};


module.exports = { getPeriodRange };