const mongoose = require("mongoose");

const UnbilledCustomerSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },

  billingPeriod: {
    type: String,
    required: true
  },

  reason: {
    type: String,
    enum: [
      "NO_VISIT",
      "NO_READING",
      "READING_OUTSIDE_PERIOD",
      "ALREADY_BILLED",
      "ERROR"
    ],
    required: true
  },

  billingRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingRun"
  },

  notedAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

UnbilledCustomerSchema.index(
  { customerId: 1, billingPeriod: 1 },
  { unique: true }
);



const UnbilledCustomer= mongoose.model('UnbilledCustomer', UnbilledCustomerSchema);
module.exports = UnbilledCustomer;