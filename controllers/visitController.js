const Visit = require("../models/visitModel");
const Customer = require("../models/customerModel");
const User = require("../models/userModel");

const {apiResponse} = require("../utils/apiResponse");
const { createNotification } = require("../services/notificationService");


const createVisit = async (req, res) => {
  const { customerId, currentReading, visitDate ,collectorId,notes} = req.body;

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

     let collector = null;
    
      if (collectorId) {
        collector = await User.findOne({
          _id: collectorId,
          deletedAt: null
        });
    
        if (!collector)
          return apiResponse({
            res,
            success: false,
            message: "Collector user not found"
          });
    
        if (collector.active !== true)
          return apiResponse({
            res,
            success: false,
            message: "Collector user is not active"
          });
    
        if (!["user", "employee", "admin"].includes(collector.role))
          return apiResponse({
            res,
            success: false,
            message: "User is not authorized as a collector"
          });
      }

      
  const lastReading =
    customer.meter.readings?.length > 0
      ? customer.meter.readings[customer.meter.readings.length - 1].reading
      : customer.meter.initialReading || 0;

      

  if (currentReading < lastReading)
    return apiResponse({
      res,
      success: false,
      message: "Meter reading cannot be less than previous reading"
    });

  const visit = await Visit.create({
    customerId,
    visitDate: visitDate || new Date(),
     lastReading,
    currentReading,
    zoneId: customer.zoneId,
    villageId: customer.villageId,
    collectorId: collectorId ,
    notes
  });
  

  // Append reading to customer
  customer.meter.readings.push({
    reading: currentReading,
    //lastReadAt: visit.visitDate,
    date: visit.dateOfVisit,
    visitId: visit._id
  });
  customer.meter.lastReading = lastReading;
  customer.meter.currentReading = currentReading;
  customer.meter.lastReadAt = visit.dateOfVisit;

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
  //await tryAutoBillVisit(visit);

  return apiResponse({
    res,
    message: "Visit recorded successfully",
    data: visit
  });
};


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
    filter.visitedAt = {};
    if (dateFrom) filter.visitedAt.$gte = new Date(dateFrom);
    if (dateTo) filter.visitedAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const [visits, total] = await Promise.all([
    Visit.find(filter)
    .sort({ visitedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("customerId", "name customerCode"),
    Visit.countDocuments(filter)
  ]);

  return apiResponse({
    res,
    data: visits,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + visits.length < total
    }
  });
};


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