const mongoose = require("mongoose");

const villageSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },

    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Zone",
      required: true
    },
    zoneCode: { type: String, required: true },

    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);



const Village= mongoose.model('Village', villageSchema);
module.exports = Village;