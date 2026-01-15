// const Customer = require('../models/Customer');
// const { generateCustomerCode } = require('../utils/generateCustomerCode');  
// const Village = require('../models/Village');
// const Zone = require('../models/Zone');

// const { getPagination } = require('../utils/pagination');
// export const createCustomer = async (req, res) => {
//   const { zoneId, villageId } = req.body;

//   const zone = await Zone.findById(zoneId);
//   const village = await Village.findById(villageId);

//   if (!zone || !village)
//     return apiResponse({ res, success: false, message: "Invalid zone/village" });

//   const customerCode = await generateCustomerCode(
//     zone.code,
//     village.code
//   );

//   const customer = await Customer.create({
//     ...req.body,
//     customerCode,
//     zoneCode: zone.code,
//     villageName: village.name
//   });

//   await createNotification({
//     type: "CUSTOMER_CREATED",
//     message: `Customer ${customer.name} onboarded`,
//     targetRoles: ["admin", "system"]
//   });

//   return apiResponse({
//     res,
//     message: "Customer created successfully",
//     data: customer
//   });
// };

// export const getCustomerById = async (req, res) => {
//   try {
//     const customer = await Customer.findOne({
//       _id: req.params.id,
//       deletedAt: null
//     });

//     if (!customer) {
//       return apiResponse({
//         res,
//         success: false,
//         message: "Customer not found",
//         statusCode: 404
//       });
//     }

//     return apiResponse({
//       res,
//       message: "Customer fetched successfully",
//       data: customer
//     });
//   } catch (error) {
//     return apiResponse({
//       res,
//       success: false,
//       message: error.message
//     });
//   }
// };


// // export const getCustomers = async (req, res) => {
// //   const customers = await Customer.find({ deletedAt: null });
// //   return apiResponse({ res, data: customers });
// // };


// export const getCustomers = async (req, res) => {
//   try {
//     const {
//       page,
//       limit,

//       zoneId,
//       villageId,
//       customerCode,
//       phone,
//       status,
//       collectorId,
//       meterNo,

//       unpaidMin,
//       unpaidMax,

//       createdFrom,
//       createdTo
//     } = req.query;

//     const { skip, limit: pageLimit, page: currentPage } = getPagination(page, limit);

//     // 🔹 Base query (soft delete safe)
//     const query = { deletedAt: null };

//     // 🔹 Filters
//     if (zoneId) query.zoneId = zoneId;
//     if (villageId) query.villageId = villageId;
//     if (status) query.status = status;
//     if (collectorId) query.collectorId = collectorId;

//     if (customerCode) {
//       query.customerCode = { $regex: customerCode, $options: "i" };
//     }

//     if (phone) {
//       query.phone = { $regex: phone, $options: "i" };
//     }

//     if (meterNo) {
//       query["meter.meterNo"] = { $regex: meterNo, $options: "i" };
//     }

//     // 🔹 Balance filters
//     if (unpaidMin || unpaidMax) {
//       query["balances.unpaid"] = {};
//       if (unpaidMin) query["balances.unpaid"].$gte = Number(unpaidMin);
//       if (unpaidMax) query["balances.unpaid"].$lte = Number(unpaidMax);
//     }

//     // 🔹 Date filters
//     if (createdFrom || createdTo) {
//       query.createdAt = {};
//       if (createdFrom) query.createdAt.$gte = new Date(createdFrom);
//       if (createdTo) query.createdAt.$lte = new Date(createdTo);
//     }

//     // 🔹 Query execution
//     const [customers, total] = await Promise.all([
//       Customer.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(pageLimit),

//       Customer.countDocuments(query)
//     ]);

//     const totalPages = Math.ceil(total / pageLimit);

//     return apiResponse({
//       res,
//       message: "Customers fetched successfully",
//       data: {
//         items: customers,
//         pagination: {
//           total,
//           page: currentPage,
//           limit: pageLimit,
//           totalPages,
//           hasNextPage: currentPage < totalPages,
//           hasPrevPage: currentPage > 1
//         }
//       }
//     });
//   } catch (error) {
//     return apiResponse({
//       res,
//       success: false,
//       message: error.message
//     });
//   }
// };


// export const updateCustomer = async (req, res) => {
//   const customer = await Customer.findOneAndUpdate(
//     { _id: req.params.id, deletedAt: null },
//     req.body,
//     { new: true }
//   );

//   if (!customer)
//     return apiResponse({ res, success: false, message: "Customer not found" });

//   await createNotification({
//     type: "CUSTOMER_UPDATED",
//     message: `Customer ${customer.name} updated`,
//     targetRoles: ["admin"]
//   });

//   return apiResponse({ res, message: "Customer updated", data: customer });
// };

// export const deleteCustomer = async (req, res) => {
//   await Customer.findByIdAndUpdate(req.params.id, {
//     deletedAt: new Date()
//   });

//   await createNotification({
//     type: "CUSTOMER_DELETED",
//     message: "Customer removed",
//     targetRoles: ["admin"]
//   });

//   return apiResponse({ res, message: "Customer deleted" });
// };

const Customer = require("../models/customerModel");
const Village = require("../models/villageModel");
const Zone = require("../models/zoneModel");
const User = require("../models/userModel");
const { generateCustomerCode } = require("../utils/generateCustomerCode");
const {apiResponse} = require("../utils/apiResponse");
const { createNotification } = require("../services/notificationService");

/**
 * CREATE CUSTOMER
 */
const createCustomer = async (req, res) => {
  const { zoneId, villageId ,collectorId,phone,name} = req.body;

  const existingCustomer = await Customer.findOne({
    phone: phone,
    name: { $regex: `^${name}$`, $options: "i" },
    deletedAt: null
  });

  if (existingCustomer)
    return apiResponse({
      res,
      success: false,
      message: "Customer with same name and phone already exists"
    });

  const zone = await Zone.findOne({ _id: zoneId, deletedAt: null });
  const village = await Village.findOne({ _id: villageId, deletedAt: null });

  if (!zone || !village)
    return apiResponse({
      res,
      success: false,
      message: "Invalid zone or village"
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

  const customerCode = await generateCustomerCode(
    zone.code,
    village.code
  );

  const customer = await Customer.create({
    ...req.body,
    collectorName: collector ? collector.email : null,
    collectorId: collector ? collector._id : null,
    customerCode,
    zoneCode: zone.code,
    zoneId: zone._id,
    villageName: village.name,
    villageId: village._id,
    status: "active",
    totalPaid: 0,
    unpaid: 0,
    expectedTotal: 0
  });

  await createNotification({
    type: "CUSTOMER_CREATED",
    message: `Customer ${customer.name} onboarded`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "customer",
      entityId: customer._id
    }
  });

  return apiResponse({
    res,
    message: "Customer created successfully",
    data: customer
  });
};

/**
 * GET ALL CUSTOMERS (FILTERS + PAGINATION)
 */
const getCustomers = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    zoneId,
    villageId,
    customerCode,
    name,
    phone,
    collectorId,
    status,
    hasBalance,
    minBalance,
    maxBalance,
    meterNo,
    dateFrom,
    dateTo
  } = req.query;

  const filter = { deletedAt: null };

  if (zoneId) filter.zoneId = zoneId;
  if (villageId) filter.villageId = villageId;
  if (customerCode) filter.customerCode = customerCode;
  if (status) filter.status = status;
  if (collectorId) filter.collectorId = collectorId;
  if (meterNo) filter.meterNo = meterNo;

  if (phone)
    filter.phone = { $regex: phone, $options: "i" };

  if (name)
    filter.name = { $regex: name, $options: "i" };

  if (hasBalance === "true")
    filter.unpaid = { $gt: 0 };

  if (hasBalance === "false")
    filter.unpaid = 0;

  if (minBalance || maxBalance) {
    filter.unpaid = {};
    if (minBalance) filter.unpaid.$gte = Number(minBalance);
    if (maxBalance) filter.unpaid.$lte = Number(maxBalance);
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Customer.countDocuments(filter)
  ]);

  return apiResponse({
    res,
    data: customers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + customers.length < total
    }
  });
};

/**
 * GET CUSTOMER BY ID
 */
 const getCustomerById = async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    deletedAt: null
  });

  if (!customer)
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });

  return apiResponse({ res, data: customer });
};

/**
 * UPDATE CUSTOMER
 */
const updateCustomer = async (req, res) => {

  const { zoneId, villageId ,zoneCode,phone,name,villageName} = req.body;

    if (phone || name) {
    const duplicate = await Customer.findOne({
      _id: { $ne: req.params.id },
      phone: phone,
      name: name
        ? { $regex: `^${name}$`, $options: "i" }
        : undefined,
      deletedAt: null
    });

    if (duplicate)
      return apiResponse({
        res,
        success: false,
        message: "Another customer with same name and phone already exists"
      });
  }
  if (zoneId || villageId) {
    const zone = zoneId
      ? await Zone.findOne({ _id: zoneId, deletedAt: null })
      : null;

    const village = villageId
      ? await Village.findOne({ _id: villageId, deletedAt: null })
      : null;

    if (zoneId && !zone)
      return apiResponse({ res, success: false, message: "Invalid zone" });

    if (villageId && !village)
      return apiResponse({ res, success: false, message: "Invalid village" });

    if (zone) zoneCode = zone.code;
    if (village) villageName = village.name;
  }

  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true }
  );

  if (!customer)
    return apiResponse({ res, success: false, message: "Customer not found" });

  await createNotification({
    type: "CUSTOMER_UPDATED",
    message: `Customer ${customer.name} updated`,
    targetRoles: ["admin"]
  });

  return apiResponse({
    res,
    message: "Customer updated successfully",
    data: customer
  });
};

/**
 * DELETE CUSTOMER (SOFT)
 */
const deleteCustomer = async (req, res) => {
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { deletedAt: new Date(), status: "DELETED" }
  );

  if (!customer)
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });

  await createNotification({
    type: "CUSTOMER_DELETED",
    message: `Customer ${customer.name} removed`,
    targetRoles: ["admin"]
  });

  return apiResponse({ res, message: "Customer deleted" });
};


module.exports = {  createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer };