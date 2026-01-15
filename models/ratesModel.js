const mongoose = require("mongoose");

const rateSchema = new mongoose.Schema(
  {
    pricingPerUnit: { type: Number, required: true },
    currency: { type: String, required: true ,default:"USD"},  
    discount: {
      type: {
        type: String,
        enum: ["percentage", "flat"],
        default: "percentage"
      },
      value: { type: Number, default: 0 }
    },

    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },

    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);



const Rate= mongoose.model('Rate', rateSchema);
module.exports = Rate;
