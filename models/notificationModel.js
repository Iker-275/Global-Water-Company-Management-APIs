const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "CUSTOMER_CREATED",
        "CUSTOMER_UPDATED",
        "CUSTOMER_DELETED",
        "VISIT_LOGGED",
        "VISIT_DELETED",
        "VISIT_CREATED",
        "BILL_GENERATED",
        "PAYMENT_RECEIVED",
        "DISCONNECTION",
        "RATE_CREATED",
        "RATE_DELETED",
        "ZONE_CREATED",
        "VILLAGE_CREATED",
        "VILLAGE_DELETED",
        "VILLAGE_UPDATED",
        "CUSTOMER_BULK_UPLOAD",
        "CUSTOMER_BILLED",
        "CUSTOMERS_BILLED",
        "BILL_REVERSED",
        "BILL_ADJUSTED"

      ],
      required: true
    },

    message: { type: String, required: true },

    targetRoles: [String],
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    relatedEntity: {
      entityType: String,
      entityId: mongoose.Schema.Types.ObjectId
    },

    isRead: { type: Boolean, default: false }
  },
  { timestamps: true }
);



const Notification= mongoose.model('Notification', notificationSchema);
module.exports = Notification;