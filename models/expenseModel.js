const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    description: {
      type: String,
      default: ""
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    // Date breakdown (stored for fast queries)
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    day: Number,
    weekOfYear: Number,
    monthOfYear: Number,
    year: Number,

    createdBy: {
      type: String,
      ref: "User",
      required: false
    }
  },
  { timestamps: true }
);

// Helpful indexes
ExpenseSchema.index({ year: 1 });
ExpenseSchema.index({ monthOfYear: 1 });
ExpenseSchema.index({ weekOfYear: 1 });
ExpenseSchema.index({ name: 1 });

module.exports = mongoose.model("Expense", ExpenseSchema);
