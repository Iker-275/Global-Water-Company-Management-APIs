const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    visitCode: { type: String, required: true, unique: true },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    customerCode: String,

    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    dateOfVisit: { type: Date, required: true },
    meterReading: { type: Number, required: true },

    notes: String,
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);


const Visit= mongoose.model('Visit', visitSchema);
module.exports = Visit;