const mongoose = require("mongoose");

const BillingRunSchema = new mongoose.Schema({
  billingPeriod: {
    type: String,
    required: true
  },

  runType: {
    type: String,
    enum: ["ZONE", "VILLAGE", "SYSTEM","GLOBAL"],
    required: true
  },

  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Zone"
  },

  villageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Village"
  },

  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  stats: {
    totalCustomers: Number,
    billed: Number,
    unbilled: Number,
    failed: Number
  },

  startedAt: {
    type: Date,
    default: Date.now
  },

  completedAt: Date,

  status: {
    type: String,
    enum: ["RUNNING", "COMPLETED", "FAILED"],
    default: "RUNNING"
  }

}, { timestamps: true });


const BillingRun= mongoose.model('BillingRun', BillingRunSchema);
module.exports = BillingRun;