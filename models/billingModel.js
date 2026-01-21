const mongoose = require("mongoose");
const User = require("./userModel");

console.log("models");

console.log(mongoose.modelNames());

const BillingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
    index: true
  },

  // Billing period
  billingPeriod: {
    type: String, // "YYYY-MM"
    required: true,
    index: true
  },

  // Readings snapshot
  previousReading: {
    type: Number,
    required: true
  },

  currentReading: {
    type: Number,
    required: true
  },

  unitsConsumed: {
    type: Number,
    required: true
  },

  ratePerUnit: {
    type: Number,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },



  // Optional extras
  fixedCharges: {
    type: Number,
    default: 0
  },

  penalties: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    required: true
  },

  // Billing source
  billingType: {
    type: String,
    enum: ["MANUAL", "ZONE", "VILLAGE", "SYSTEM","GLOBAL","REVERSAL","ADJUSTMENT"],
    required: true
  },

  billingRunId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BillingRun"
  },

  // References to visits used
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visit",
    required: true
  },

  billedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },

  billedAt: {
    type: Date,
    default: Date.now
  },

  // Financial lifecycle  status
 status: {
      type: String,
      enum: ["ACTIVE", "PAID", "PARTIAL", "REVERSED", "ADJUSTED"],
      default: "ACTIVE",
      index: true
    },
  reversedAt: Date,
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },

  reversalReason: String,
//   status: {
//   type: String,
//   enum: ["ACTIVE", "REVERSED", "ADJUSTED"],
//   default: "ACTIVE"
// },

reversalOf: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Billing",
  default: null
},

adjustmentOf: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Billing",
  default: null
},

reason: String,

approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "user"
},

approvedAt: Date


}, { timestamps: true });


// // Prevent double billing
// BillingSchema.index(
//   { customerId: 1, billingPeriod: 1 },
//   { unique: true }
// );


const BillingSchema2 = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },

    billingPeriod: {
      type: String, // YYYY-MM
      required: true,
      index: true
    },

    // Meter readings snapshot (only meaningful for NORMAL bills)
    previousReading: Number,
    currentReading: Number,

    unitsConsumed: {
      type: Number,
      required: true
    },

    ratePerUnit: {
      type: Number,
      required: true
    },

    amount: {
      type: Number,
      required: true
    },

    fixedCharges: {
      type: Number,
      default: 0
    },

    penalties: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      required: true
    },

    billingType: {
      type: String,
      enum: [
        "MANUAL",
        "ZONE",
        "VILLAGE",
        "GLOBAL",
        "AUTO_VISIT",
        "REVERSAL",
        "ADJUSTMENT"
      ],
      required: true,
      index: true
    },

    billingRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BillingRun"
    },

    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: function () {
        return !["REVERSAL", "ADJUSTMENT"].includes(this.billingType);
      }
    },

    billedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    billedAt: {
      type: Date,
      default: Date.now
    },

    // Financial lifecycle status
    status: {
      type: String,
      enum: ["ACTIVE", "PAID", "PARTIAL", "REVERSED", "ADJUSTED"],
      default: "ACTIVE",
      index: true
    },

    reversalOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      default: null
    },

    adjustmentOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Billing",
      default: null
    },

    reason: String,

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    approvedAt: Date
  },
  { timestamps: true }
);







BillingSchema.index(
  { customerId: 1, billingPeriod: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: "ACTIVE",
      billingType: {
        $in: ["MANUAL", "ZONE", "VILLAGE", "GLOBAL", "AUTO_VISIT"]
      }
    }
  }
);


BillingSchema.index({ zoneId: 1 });
BillingSchema.index({ createdAt: -1 });
BillingSchema.index({ billingRunId: 1 });
BillingSchema.index({ reversalOf: 1 });




const Billing= mongoose.model('Billing', BillingSchema);
module.exports = Billing;


