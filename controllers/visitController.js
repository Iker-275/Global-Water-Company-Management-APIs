const Visit = require("../models/visitModel");
const Customer = require("../models/customerModel");
const {apiResponse} = require("../utils/apiResponse");
const { createNotification } = require("../services/notificationService");

/**
 * CREATE VISIT (Meter Reading)
 * - Adds reading to customer
 * - Prevents backward readings
 */
const createVisit = async (req, res) => {
  const { customerId, currentRead, visitDate } = req.body;

  const customer = await Customer.findOne({
    _id: customerId,
    deletedAt: null
  });

  if (!customer)
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });

  const lastReading =
    customer.readings?.length > 0
      ? customer.readings[customer.readings.length - 1].reading
      : customer.initialMeterReading || 0;

  if (currentRead < lastReading)
    return apiResponse({
      res,
      success: false,
      message: "Meter reading cannot be less than previous reading"
    });

  const visit = await Visit.create({
    customerId,
    visitDate: visitDate || new Date(),
    previousRead: lastReading,
    currentRead,
    zoneId: customer.zoneId,
    villageId: customer.villageId,
    collectorId: req.user?._id // if auth middleware exists
  });

  // Append reading to customer
  customer.readings.push({
    reading: currentRead,
    date: visit.visitDate,
    visitId: visit._id
  });

  customer.visitIds.push(visit._id);
  await customer.save();

  await createNotification({
    type: "VISIT_CREATED",
    message: `Visit recorded for ${customer.name}`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "visit",
      entityId: visit._id
    }
  });

  return apiResponse({
    res,
    message: "Visit recorded successfully",
    data: visit
  });
};

/**
 * GET VISITS (FILTERS + PAGINATION)
 */
 const getVisits = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    customerId,
    zoneId,
    villageId,
    collectorId,
    dateFrom,
    dateTo
  } = req.query;

  const filter = { deletedAt: null };

  if (customerId) filter.customerId = customerId;
  if (zoneId) filter.zoneId = zoneId;
  if (villageId) filter.villageId = villageId;
  if (collectorId) filter.collectorId = collectorId;

  if (dateFrom || dateTo) {
    filter.visitDate = {};
    if (dateFrom) filter.visitDate.$gte = new Date(dateFrom);
    if (dateTo) filter.visitDate.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const [visits, total] = await Promise.all([
    Visit.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ visitDate: -1 })
      .populate("customerId", "name customerCode"),
    Visit.countDocuments(filter)
  ]);

  return apiResponse({
    res,
    data: visits,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + visits.length < total
    }
  });
};

/**
 * GET VISIT BY ID
 */
 const getVisitById = async (req, res) => {
  const visit = await Visit.findOne({
    _id: req.params.id,
    deletedAt: null
  }).populate("customerId", "name customerCode");

  if (!visit)
    return apiResponse({
      res,
      success: false,
      message: "Visit not found"
    });

  return apiResponse({ res, data: visit });
};

/**
 * DELETE VISIT (SOFT)
 * - Also removes reading from customer
 */
 const deleteVisit = async (req, res) => {
  const visit = await Visit.findOne({
    _id: req.params.id,
    deletedAt: null
  });

  if (!visit)
    return apiResponse({
      res,
      success: false,
      message: "Visit not found"
    });

  await Visit.findByIdAndUpdate(visit._id, {
    deletedAt: new Date()
  });

  await Customer.updateOne(
    { _id: visit.customerId },
    {
      $pull: {
        visitIds: visit._id,
        readings: { visitId: visit._id }
      }
    }
  );

  await createNotification({
    type: "VISIT_DELETED",
    message: "Visit removed",
    targetRoles: ["admin"]
  });

  return apiResponse({ res, message: "Visit deleted" });
};


module.exports = { createVisit, getVisits, getVisitById, deleteVisit };