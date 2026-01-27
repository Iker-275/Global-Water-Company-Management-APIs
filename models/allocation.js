const mongoose = require("mongoose");


const PaymentAllocationSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true
    },

    billingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      required: true,
      index: true
    },

    amountCents: {
      type: Number,
      required: true,
      min: 0.1
    }
  },
  { timestamps: true }
);

PaymentAllocationSchema.index(
  { paymentId: 1, billingId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PaymentAllocation",
  PaymentAllocationSchema
);
