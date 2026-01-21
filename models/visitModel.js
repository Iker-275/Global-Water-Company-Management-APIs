const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
   // _id: { type: String, required: true, unique: true },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    customerCode: String,

    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    dateOfVisit: { type: Date, required: true, default: Date.now },
    visitedAt: {
      type: Date,
      required: true,
      default: Date.now // auto-captures date + time
    },
    
    lastReading: { type: Number, required: true },
    currentReading: { type: Number, required: true },
isBilled: { type: Boolean, default: false },
billingId: { type: mongoose.Schema.Types.ObjectId, ref: "Billing" },

    notes: String,
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);
visitSchema.index({ visitedAt: -1 });
visitSchema.index({ customerId: 1, visitedAt: -1 });
visitSchema.index({ collectorId: 1, visitedAt: -1 });



const Visit= mongoose.model('Visit', visitSchema);
module.exports = Visit;