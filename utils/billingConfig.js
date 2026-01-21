const mongoose = require('mongoose');

const billingConfigSchema = new mongoose.Schema({
  autoBillOnVisit: { type: Boolean, default: false },

  autoBillScope: {
    type: String,
    enum: ["GLOBAL", "ZONE", "VILLAGE"],
    default: "GLOBAL"
  },

  allowedRoles: [String], // who can trigger visit billing

  requireMonthlyWindow: { type: Boolean, default: true },

  billingCycle: {
    type: String,
    enum: ["MONTHLY", "ON_VISIT"],
    default: "MONTHLY"
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});


const BillingConfig = mongoose.model('BillingConfig', billingConfigSchema);
module.exports = BillingConfig;