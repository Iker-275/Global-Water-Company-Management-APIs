const BillingPeriod = require("../models/billingPeriodModel");
const { apiResponse } = require("../utils/apiResponse")
const { createNotification } = require('../services/notificationService');

const createBillingPeriod = async (req, res) => {
  const { period, notes, userId } = req.body;

  if (!period) {
    return apiResponse({
      res,
      success: false,
      message: "period is required (YYYY-MM)"
    });
  }

  const exists = await BillingPeriod.findOne({ period, deletedAt: null });
  if (exists) {
    return apiResponse({
      res,
      success: false,
      message: "Billing period already exists"
    });
  }

  const billingPeriod = await BillingPeriod.create({
    period,
    notes,
    createdBy: userId
  });

   await createNotification({
      type: "BILLING_PERIOD_CREATED",
      message: `Billing period ${period} created successfully`,
      targetRoles: ["admin","system"]
    });

  return apiResponse({
    res,
    message: "Billing period created",
    data: billingPeriod
  });
};

const getBillingPeriods = async (req, res) => {
  const { status, page = 1, limit = 12 } = req.query;

  const filter = { deletedAt: null };
  if (status) filter.status = status;

  const skip = (page - 1) * limit;

  const [periods, total] = await Promise.all([
    BillingPeriod.find(filter)
      .sort({ period: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    BillingPeriod.countDocuments(filter)
  ]);

  return apiResponse({
    res,
    data: periods,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};


const getBillingPeriod = async (req, res) => {
  const { id } = req.params;

  const period = await BillingPeriod.findOne({
    _id: id,
    deletedAt: null
  }).lean();

  if (!period) {
    return apiResponse({
      res,
      success: false,
      message: "Billing period not found"
    });
  }

  return apiResponse({ res, data: period });
};

const updateBillingPeriod = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const period = await BillingPeriod.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { notes },
    { new: true }
  );

  if (!period) {
    return apiResponse({
      res,
      success: false,
      message: "Billing period not found"
    });
  }

  await createNotification({
      type: "BILLING_PERIOD_UPDATED",
      message: `Billing period ${period.period} updated successfully`,
      targetRoles: ["admin","system"]
    });

  return apiResponse({
    res,
    message: "Billing period updated",
    data: period
  });
};


const closeBillingPeriod = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const period = await BillingPeriod.findOne({
    _id: id,
    deletedAt: null
  });

  if (!period) {
    return apiResponse({
      res,
      success: false,
      message: "Billing period not found"
    });
  }

  if (period.status !== "OPEN") {
    return apiResponse({
      res,
      success: false,
      message: "Only OPEN periods can be closed"
    });
  }

  period.status = "CLOSED";
  period.closedAt = new Date();
  period.closedBy = userId;

  await period.save();

  await createNotification({
      type: "BILLING_PERIOD_CLOSED",
      message: `Billing period ${period.period} closed successfully`,
      targetRoles: ["admin","system"]
    });

  return apiResponse({
    res,
    message: "Billing period closed",
    data: period
  });
};


const lockBillingPeriod = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const period = await BillingPeriod.findOne({
    _id: id,
    deletedAt: null
  });

  if (!period) {
    return apiResponse({
      res,
      success: false,
      message: "Billing period not found"
    });
  }

  if (period.status !== "CLOSED") {
    return apiResponse({
      res,
      success: false,
      message: "Only CLOSED periods can be locked"
    });
  }

  period.status = "LOCKED";
  period.lockedAt = new Date();
  period.lockedBy = userId;

  await period.save();

  await createNotification({
      type: "BILLING_PERIOD_LOCKED",
      message: `Billing period ${period.period} locked successfully`,
      targetRoles: ["admin","system"]
    });

  return apiResponse({
    res,
    message: "Billing period locked",
    data: period
  });
};

const deleteBillingPeriod = async (req, res) => {
  const { id } = req.params;

  const period = await BillingPeriod.findOneAndUpdate(
    { _id: id },
    { deletedAt: new Date() },
    { new: true }
  );

  await createNotification({
      type: "BILLING_PERIOD_DELETED",
      message: `Billing period ${period.period} deleted successfully`,
      targetRoles: ["admin","system"]
    });
  return apiResponse({
    res,
    message: "Billing period deleted",
    data: period
  });
};


module.exports = {deleteBillingPeriod,updateBillingPeriod,lockBillingPeriod,closeBillingPeriod,getBillingPeriod,getBillingPeriods,createBillingPeriod}