const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      index: true
    },

    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      index: true
    },

    amountCents: {
      type: Number,
      required: true,
      min: 1
    },

    currency: {
      type: String,
      default: "USD"
    },

    method: {
      type: String,
      enum: [ "ACCOUNT"],
      required: true
    },

    reference: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
      index: true
    },

    receivedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    // Reversal support
    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null
    },

    reason: {
      type: String
    }
  },
  { timestamps: true }
);

PaymentSchema.index({ customerId: 1, receivedAt: -1 });
PaymentSchema.index({ zoneId: 1, receivedAt: -1 });
PaymentSchema.index({ villageId: 1, receivedAt: -1 });

module.exports = mongoose.model("Payment", PaymentSchema);
