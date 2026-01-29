// models/billingPeriodModel.js
const mongoose = require("mongoose");

const billingPeriodSchema = new mongoose.Schema(
  {
    period: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/ // YYYY-MM
    },

    status: {
      type: String,
      enum: ["OPEN", "CLOSED", "LOCKED"],
      default: "OPEN"
    },

    openedAt: {
      type: Date,
      default: Date.now
    },

    closedAt: Date,

    lockedAt: Date,

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user"
    },

    deletedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillingPeriod", billingPeriodSchema);
