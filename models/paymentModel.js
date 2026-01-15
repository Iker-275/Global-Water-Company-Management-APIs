const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    paymentCode: { type: String, required: true, unique: true },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true
    },
    customerName: String,

    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },

    amountPaid: { type: Number, required: true },
    discountGiven: { type: Number, default: 0 },

    totalAccumulated: Number,
    unpaidAfterPayment: Number,

    paymentMethod: {
      type: String,
      enum: ["cash", "mobile", "free"],
      default: "cash"
    },

    comment: String,
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
