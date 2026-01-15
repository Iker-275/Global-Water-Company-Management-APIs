const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);



const Zone= mongoose.model('Zone', zoneSchema);
module.exports = Zone;