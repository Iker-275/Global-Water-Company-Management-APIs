const Counter = require('../models/counterModel');

 const generateCustomerCode = async (zoneCode, villageCode) => {
  const key = `${zoneCode}-${villageCode}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `${zoneCode}-${villageCode}-${String(counter.seq).padStart(5, "0")}`;
};

module.exports = { generateCustomerCode };