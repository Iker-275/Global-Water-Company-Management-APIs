const mongoose = require("mongoose");


const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, required: true, unique: true },
    houseNo: { type: String, required: true },

    name: { type: String, required: true },
    phone: { type: String, required: true },

    purpose: {
      type: String,
      enum: ["domestic", "business",],
      default: "domestic"
    },
    businessName: String,

    zoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", required: true },
    zoneCode: String,

    villageId: { type: mongoose.Schema.Types.ObjectId, ref: "Village", required: true },
    villageName: String,

    collectorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    collectorName: String,

    meter: {
      meterNo: { type: String, required: true },
      initialReading: { type: Number, required: true },
      readings: [
        {
          visitId: { type: mongoose.Schema.Types.ObjectId, ref: "Visit" },
          reading: Number,
          date: Date
        }
      ],
      // lastReading: { type: Number ,required: true },

      currentReading: { type: Number, required: true },
      lastReadAt: Date
    },

    balances: {
      previousBalance: { type: Number, default: 0 },
      expectedTotal: { type: Number, default: 0 },
      totalPaid: { type: Number, default: 0 },
      unpaid: { type: Number, default: 0 }
    },

    visitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Visit" }],
    paymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],

    status: {
      type: String,
      enum: ["active", "disconnected"],
      default: "active"
    },

    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);
customerSchema.index(
  { phone: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null }
  }
);
customerSchema.index({ zoneId: 1 });
customerSchema.index({ villageId: 1 });
// customerSchema.index({ customerCode: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ collectorId: 1 });
customerSchema.index({ "meter.meterNo": 1 });
customerSchema.index({ "balances.unpaid": 1 });
customerSchema.index({ createdAt: -1 });





const Customer= mongoose.model('Customer', customerSchema);
module.exports = Customer;