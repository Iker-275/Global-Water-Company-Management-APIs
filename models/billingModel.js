const mongoose = require("mongoose");

const rateSchema = new mongoose.Schema(
  {
    pricing: {
      perUnit: { type: Number, required: true },
      minimumCharge: { type: Number, required: true }
    },

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

export default mongoose.model("Rate", rateSchema);
