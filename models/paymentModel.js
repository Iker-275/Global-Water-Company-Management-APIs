const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true
  },

  billingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Billing"
  },

  amountPaid: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["ACCOUNT"],
    required: true
  },

  reference: String,

  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  paidAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });


const Payment= mongoose.model('Payment', PaymentSchema);
module.exports = Payment;