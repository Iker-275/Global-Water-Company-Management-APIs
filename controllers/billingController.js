
const { createNotification } = require("../services/notificationService");
const { apiResponse } = require("../utils/apiResponse");
const Customer = require("../models/customerModel");
const Zone = require("../models/zoneModel");
const Billing = require("../models/billingModel");
const Visit = require("../models/visitModel");
const Rate = require("../models/ratesModel");
const UnbilledCustomer = require("../models/unbilledModel");
const BillingRun = require("../models/billingRun");
const Village = require("../models/villageModel");
require("../models/userModel");

const { getPeriodRange } = require("../utils/dateRange");




const billCustomersPerZone = async (req, res) => {
  const { zoneId } = req.params;
  const { billingPeriod, userId, rateId } = req.body;

  if (!billingPeriod || !rateId) {
    return apiResponse({
      res,
      success: false,
      message: "billingPeriod and rateId are required"
    });
  }

  const zone = await Zone.findOne({ _id: zoneId, deletedAt: null });
  if (!zone)
    return apiResponse({ res, success: false, message: "Invalid zone" });

  // 🔒 HARD RATE VALIDATION
  const rate = await Rate.findOne({ _id: rateId, deletedAt: null });
  if (!rate) {
    return apiResponse({
      res,
      success: false,
      message: "Billing failed: Rate not found"
    });
  }

  const { start, end } = getPeriodRange(billingPeriod);

  const billingRun = await BillingRun.create({
    billingPeriod,
    runType: "ZONE",
    zoneId,
    triggeredBy: userId,
    rateId
  });

  const customers = await Customer.find({
    zoneId,
    deletedAt: null,
    status: "active"
  });

  let billed = 0;
  let unbilled = 0;
  let failed = 0;

  for (const customer of customers) {
    try {
      const existingBill = await Billing.findOne({
        customerId: customer._id,
        billingPeriod,
        status: { $ne: "REVERSED" }
        //status: "ACTIVE"
      });
      if (existingBill) continue;

      const visit = await Visit.findOne({
        customerId: customer._id,
        deletedAt: null,
        dateOfVisit: { $gte: start, $lte: end }
      }).sort({ dateOfVisit: -1 });

      if (!visit) {
        await UnbilledCustomer.create({
          customerId: customer._id,
          billingPeriod,
          reason: "NO_VISIT",
          billingRunId: billingRun._id
        });
        unbilled++;
        continue;
      }

      const previousReading =
        customer.meter?.lastReading ??
        customer.meter?.initialReading ??
        0;

      const currentReading = visit.currentReading;

      if (currentReading < previousReading) {
        await UnbilledCustomer.create({
          customerId: customer._id,
          billingPeriod,
          reason: "INVALID_READING",
          billingRunId: billingRun._id
        });
        unbilled++;
        continue;
      }

      const unitsConsumed = currentReading - previousReading;

      let amount = unitsConsumed * rate.pricingPerUnit;

      if (rate.discount?.type === "percentage") {
        amount -= (amount * rate.discount.value) / 100;
      }

      const totalAmount =
        amount + (customer.balances?.previousBalance || 0);

      await Billing.create({
        customerId: customer._id,
        billingPeriod,
        previousReading,
        currentReading,
        unitsConsumed,
        ratePerUnit: rate.pricingPerUnit,
        discountApplied: rate.discount || null,
        amount,
        totalAmount,
        billingType: "ZONE",
        billingRunId: billingRun._id,
        visitId: visit._id,
        billedBy: userId
      });

      await Customer.updateOne(
        { _id: customer._id },
        {
          "balances.expectedTotal": totalAmount,
          "balances.unpaid":
            totalAmount - (customer.balances?.totalPaid || 0)
        }
      );

      billed++;
    } catch (err) {
      failed++;
      console.error("Billing error for customer", customer._id, err);
    }
  }

  billingRun.stats = {
    totalCustomers: customers.length,
    billed,
    unbilled,
    failed
  };
  billingRun.status = "COMPLETED";
  billingRun.completedAt = new Date();
  await billingRun.save();

  await createNotification({
    type: "CUSTOMER_BILLED",
    message: `Zone ${zone.name} Customers billed for ${billingPeriod}`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "billing",
      entityId: billingRun._id
    }
  });

  return apiResponse({
    res,
    message: "Zone billing completed",
    data: billingRun
  });
};

const billSingleCustomer = async (req, res) => {
  const { customerId } = req.params;
  const { billingPeriod, override = false, userId, rateId } = req.body;


  if (!billingPeriod || !rateId) {
    return apiResponse({
      res,
      success: false,
      message: "billingPeriod and rateId are required"
    });
  }

  const customer = await Customer.findOne({
    _id: customerId,
    deletedAt: null,
    status: "active"
  });

  if (!customer)
    return apiResponse({
      res,
      success: false,
      message: "Customer not found or inactive"
    });

  // Prevent double billing
  const existingBill = await Billing.findOne({
    customerId,
    billingPeriod,
    status: { $ne: "REVERSED" }
    // status: "ACTIVE"
  });

  if (existingBill && !override)
    return apiResponse({
      res,
      success: false,
      message: "Customer already billed for this period"
    });

  const { start, end } = getPeriodRange(billingPeriod);

  // Fetch visit
  const visit = await Visit.findOne({
    customerId,
    deletedAt: null,
    dateOfVisit: { $gte: start, $lte: end }
  }).sort({ dateOfVisit: -1 });

  if (!visit)
    return apiResponse({
      res,
      success: false,
      message: "No visit found for this customer in billing period"
    });

  const previousReading =
    customer.meter?.lastReading ??
    customer.meter?.initialReading ??
    0;

  const currentReading = visit.currentReading;

  if (currentReading < previousReading)
    return apiResponse({
      res,
      success: false,
      message: "Invalid meter reading (lower than previous)"
    });

  const unitsConsumed = currentReading - previousReading;

  // console.log("Units Consumed: " + unitsConsumed);
  // console.log("currentReading: " + currentReading);
  // console.log("previousReading: " + previousReading);


  const rate = await Rate.findOne({ _id: rateId, deletedAt: null });

  if (!rate)
    return apiResponse({
      res,
      success: false,
      message: "No applicable rate found"
    });



  const previousBalance = customer.balances?.previousBalance || 0;

 // console.log("Previous Balance: " + previousBalance);

  let amount = unitsConsumed * rate.pricingPerUnit;

  if (rate.discount?.type === "percentage") {
    amount -= (amount * rate.discount.value) / 100;
  }

  const totalAmount =
    amount + (customer.balances?.previousBalance || 0);

    // console.log("Amount: " + amount);
    // console.log("Total Amount: " + totalAmount);

  const bill = await Billing.create({
    customerId,
    billingPeriod,
    previousReading,
    currentReading,
    unitsConsumed,
    ratePerUnit: rate.pricingPerUnit,
    discountApplied: rate.discount || null,
    amount,
    totalAmount,
    billingType: "MANUAL",
    visitId: visit._id,
    billedBy: userId
  });

  // Update customer snapshot
  await Customer.updateOne(
    { _id: customerId },
    {
      "balances.expectedTotal": totalAmount,
      "balances.unpaid":
        totalAmount - (customer.balances?.totalPaid || 0)
    }
  );

  await createNotification({
    type: "CUSTOMER_BILLED",
    message: `Customer ${customer.name} billed manually for ${billingPeriod}`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "billing",
      entityId: bill._id
    }
  });

  return apiResponse({
    res,
    message: "Customer billed successfully",
    data: bill
  });
};

const billCustomersPerVillage = async (req, res) => {
  const { villageId } = req.params;
  const { billingPeriod, userId, rateId } = req.body;

  if (!billingPeriod || !rateId) {
    return apiResponse({
      res,
      success: false,
      message: "billingPeriod and rateId are required"
    });
  }

  const village = await Village.findOne({ _id: villageId, deletedAt: null });
  if (!village)
    return apiResponse({ res, success: false, message: "Invalid village" });

  const rate = await Rate.findOne({ _id: rateId, deletedAt: null });
  if (!rate)
    return apiResponse({ res, success: false, message: "Rate not found" });

  const { start, end } = getPeriodRange(billingPeriod);

  const billingRun = await BillingRun.create({
    billingPeriod,
    runType: "VILLAGE",
    villageId,
    zoneId: village.zoneId,
    triggeredBy: userId,
    rateId
  });

  const customers = await Customer.find({
    villageId,
    deletedAt: null,
    status: "active"
  });

  let billed = 0, unbilled = 0, failed = 0;

  for (const customer of customers) {
    try {
      const existingBill = await Billing.findOne({
        customerId: customer._id,
        billingPeriod,
        status: { $ne: "REVERSED" }
      //  status: "ACTIVE"
      });
      if (existingBill) continue;

      const visit = await Visit.findOne({
        customerId: customer._id,
        deletedAt: null,
        dateOfVisit: { $gte: start, $lte: end }
      }).sort({ dateOfVisit: -1 });

      if (!visit) {
        await UnbilledCustomer.create({
          customerId: customer._id,
          billingPeriod,
          reason: "NO_VISIT",
          billingRunId: billingRun._id
        });
        unbilled++;
        continue;
      }

      const previousReading =
        customer.meter?.lastReading ??
        customer.meter?.initialReading ??
        0;

      const currentReading = visit.currentReading;
      if (currentReading < previousReading) {
        unbilled++;
        continue;
      }

      const unitsConsumed = currentReading - previousReading;

      let amount = unitsConsumed * rate.pricingPerUnit;
      if (rate.discount?.type === "percentage") {
        amount -= (amount * rate.discount.value) / 100;
      }

      const totalAmount =
        amount + (customer.balances?.previousBalance || 0);

      await Billing.create({
        customerId: customer._id,
        billingPeriod,
        previousReading,
        currentReading,
        unitsConsumed,
        ratePerUnit: rate.pricingPerUnit,
        discountApplied: rate.discount || null,
        amount,
        totalAmount,
        billingType: "VILLAGE",
        billingRunId: billingRun._id,
        visitId: visit._id,
        billedBy: userId
      });

      await Customer.updateOne(
        { _id: customer._id },
        {
          "balances.expectedTotal": totalAmount,
          "balances.unpaid":
            totalAmount - (customer.balances?.totalPaid || 0)
        }
      );

      billed++;
    } catch (err) {
      failed++;
    }
  }

  billingRun.stats = { totalCustomers: customers.length, billed, unbilled, failed };
  billingRun.status = "COMPLETED";
  billingRun.completedAt = new Date();
  await billingRun.save();

  await createNotification({
    type: "CUSTOMER_BILLED",
    message: `Village ${village.name} Customers billed for ${billingPeriod}`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "billing",
      entityId: billingRun._id
    }
  });


  return apiResponse({
    res,
    message: "Village billing completed",
    data: billingRun
  });
};


const billAllCustomers = async (req, res) => {
  const { billingPeriod, rateId, userId } = req.body;


  if (!billingPeriod || !rateId) {
    return apiResponse({
      res,
      success: false,
      message: "billingPeriod and rateId are required"
    });
  }



  // 🔒 HARD RATE VALIDATION
  const rate = await Rate.findOne({ _id: rateId, deletedAt: null });
  if (!rate) {
    return apiResponse({
      res,
      success: false,
      message: "Billing failed: Rate not found"
    });
  }

  const { start, end } = getPeriodRange(billingPeriod);

  // 1️⃣ Create billing run
  const billingRun = await BillingRun.create({
    billingPeriod,
    runType: "GLOBAL",
    triggeredBy: userId
  });

  // 2️⃣ Fetch all active customers
  const customers = await Customer.find({
    deletedAt: null,
    status: "active"
  });
  

  let billed = 0;
  let unbilled = 0;
  let failed = 0;

  for (const customer of customers) {
    try {
      // 3️⃣ Prevent double billing
      const existingBill = await Billing.findOne({
        customerId: customer._id,
        billingPeriod,
        status: { $ne: "REVERSED" }
        //status: "ACTIVE"
      });
      if (existingBill) continue;

      // 4️⃣ Get latest visit in period
      const visit = await Visit.findOne({
        customerId: customer._id,
        deletedAt: null,
        dateOfVisit: { $gte: start, $lte: end }
      }).sort({ dateOfVisit: -1 });

      if (!visit) {
        await UnbilledCustomer.create({
          customerId: customer._id,
          billingPeriod,
          reason: "NO_VISIT",
          billingRunId: billingRun._id
        });
        unbilled++;
        continue;
      }

      // 5️⃣ Consumption calculation
      const previousReading =
        customer.meter?.lastReading ??
        customer.meter?.initialReading ??
        0;

      const currentReading = visit.currentReading;

      if (currentReading < previousReading) {
        await UnbilledCustomer.create({
          customerId: customer._id,
          billingPeriod,
          reason: "INVALID_READING",
          billingRunId: billingRun._id
        });
        unbilled++;
        continue;
      }

      const unitsConsumed = currentReading - previousReading;

      let amount = unitsConsumed * rate.pricingPerUnit;

      if (rate.discount?.type === "percentage") {
        amount -= (amount * rate.discount.value) / 100;
      }

      const totalAmount =
        amount + (customer.balances?.previousBalance || 0);

      // 7️⃣ Create bill
      await Billing.create({
        customerId: customer._id,
        billingPeriod,
        previousReading,
        currentReading,
        unitsConsumed,
        ratePerUnit: rate.pricingPerUnit,
        discountApplied: rate.discount || null,
        amount,
        totalAmount,
        previousReading,
        currentReading,
        unitsConsumed,
        ratePerUnit: rate.pricingPerUnit,
        amount,
        billingType: "GLOBAL",
        billingRunId: billingRun._id,
        visitId: visit._id,
        billedBy: userId
      });

      // 8️⃣ Update customer snapshot
      await Customer.updateOne(
        { _id: customer._id },
        {
          "balances.expectedTotal": totalAmount,
          "balances.unpaid":
            totalAmount - (customer.balances?.totalPaid || 0)
        }
      );

      billed++;
    } catch (err) {
      // console.log("Error" + err);
      // console.error("Global billing error:", err);
      failed++;
    }
  }

  // 9️⃣ Finalize billing run
  billingRun.stats = {
    totalCustomers: customers.length,
    billed,
    unbilled,
    failed
  };
  billingRun.status = "COMPLETED";
  billingRun.completedAt = new Date();
  await billingRun.save();

  await createNotification({
    type: "CUSTOMERS_BILLED",
    message: `All customers billed for ${billingPeriod}`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "billing",
      entityId: billingRun._id
    }
  });

  return apiResponse({
    res,
    message: "Global billing completed successfully",
    data: billingRun
  });
};



const tryAutoBillVisit = async (visit) => {
  const config = await BillingConfig.findOne();

  if (!config?.autoBillOnVisit) return;

  const customer = await Customer.findById(visit.customerId);
  if (!customer || customer.status !== "active") return;

  const billingPeriod = getBillingPeriod(visit.visitDate);

  const existingBill = await Billing.findOne({
    customerId: customer._id,
    billingPeriod,
    status: { $ne: "REVERSED" }
  });

  if (existingBill) return;

  const previousReading =
    customer.meter.lastReading ??
    customer.meter.initialReading ??
    0;

  if (visit.currentReading < previousReading) return;

  const rate = await Rate.findOne({
    purpose: customer.purpose,
    deletedAt: null
  });

  if (!rate) return;

  const units = visit.currentReading - previousReading;
  const amount = units * rate.pricePerUnit;

  const bill = await Billing.create({
    customerId: customer._id,
    billingPeriod,
    visitId: visit._id,
    previousReading,
    currentReading: visit.currentReading,
    unitsConsumed: units,
    amount,
    billingType: "AUTO_VISIT"
  });

  await Customer.updateOne(
    { _id: customer._id },
    {
      "meter.lastReading": visit.currentReading,
      "meter.lastReadAt": visit.visitDate,
      "balances.expectedTotal": amount,
      "balances.unpaid":
        amount - (customer.balances.totalPaid || 0)
    }
  );

  await Visit.updateOne(
    { _id: visit._id },
    { isBilled: true, billingId: bill._id }
  );
};

const reverseBilling = async (req, res) => {
  const { billingId } = req.params;
  const { reason, userId } = req.body;


  const bill = await Billing.findOne({
    _id: billingId,
    status: "ACTIVE"
  });

  if (!bill)
    return apiResponse({
      res,
      success: false,
      message: "Active billing record not found"
    });

  const customer = await Customer.findById(bill.customerId);
  if (!customer)
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });
// console.log("Bill to reverse: " + bill);
// console.log("Customer: " + customer);
  // Create reversal bill
  const reversal = await Billing.create({
    customerId: bill.customerId,
    billingPeriod: bill.billingPeriod,
    unitsConsumed: -bill.unitsConsumed,
    amount: -bill.amount,
    visitId: bill.visitId,
    currentReading: bill.currentReading,
    previousReading: bill.previousReading,
    ratePerUnit: bill.ratePerUnit, 
   // fixedCharges: -bill.fixedCharges,
    totalAmount: -bill.totalAmount,
    billingType: "REVERSAL",
    status: "REVERSED",
    reversalOf: bill._id,
    reason,
    approvedBy: userId,
    approvedAt: new Date()
  });

  // Update original bill
  await Billing.updateOne(
    { _id: bill._id },
    { status: "REVERSED" ,}
  );

  // Restore customer balances
  await Customer.updateOne(
    { _id: customer._id },
    {
      $inc: {
        "balances.expectedTotal": -bill.totalAmount,
        "balances.unpaid": -bill.totalAmount
      }
    }
  );

  await createNotification({
    type: "BILL_REVERSED",
    message: `Bill reversed for customer ${customer.name}`,
    targetRoles: ["admin", "system"],
    relatedEntity: {
      entityType: "billing",
      entityId: bill._id
    }
  });

  return apiResponse({
    res,
    message: "Billing reversed successfully",
    data: reversal
  });
};

const adjustBilling = async (req, res) => {
  const { billingId } = req.params;
  const { newAmount, reason, userId } = req.body;


  const bill = await Billing.findOne({
    _id: billingId,
    status: "ACTIVE"
  });

  if (!bill)
    return apiResponse({
      res,
      success: false,
      message: "Active billing record not found"
    });

  const difference = newAmount - bill.totalAmount;

  if (difference === 0)
    return apiResponse({
      res,
      success: false,
      message: "No adjustment needed"
    });

  const adjustment = await Billing.create({
    customerId: bill.customerId,
    billingPeriod: bill.billingPeriod,
    totalAmount: difference,
    visitId: bill.visitId,
    currentReading: bill.currentReading,
    previousReading: bill.previousReading,
    ratePerUnit: bill.ratePerUnit,
    amount: difference,
    unitsConsumed: bill.unitsConsumed,
    billingType: "ADJUSTMENT",
    adjustmentOf: bill._id,
    reason,
    approvedBy: userId,
    approvedAt: new Date()
  });

  await Billing.updateOne(
    { _id: bill._id },
    { status: "ACTIVE", billingType: "ADJUSTMENT" }
  );

  await Customer.updateOne(
    { _id: bill.customerId },
    {
      $inc: {
        "balances.expectedTotal": difference,
        "balances.unpaid": difference
      }
    }
  );

  await createNotification({
    type: "BILL_ADJUSTED",
    message: "Billing adjusted successfully",
    targetRoles: ["admin"]
  });

  return apiResponse({
    res,
    message: "Billing adjusted successfully",
    data: adjustment
  });
};

const getBillings = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    customerId,
    zoneId,
    villageId,
    collectorId,
    billingPeriod,
    billingType,
    status,
    minAmount,
    maxAmount,
    dateFrom,
    dateTo,
    unpaidOnly,
    summary
  } = req.query;

  const filter = { deletedAt: null };

  if (customerId) filter.customerId = customerId;
  if (billingPeriod) filter.billingPeriod = billingPeriod;
  if (billingType) filter.billingType = billingType;
  if (status) filter.status = status;

  if (zoneId) filter.zoneId = zoneId;
  if (villageId) filter.villageId = villageId;
  if (collectorId) filter.collectorId = collectorId;

  if (minAmount || maxAmount) {
    filter.totalAmount = {};
    if (minAmount) filter.totalAmount.$gte = Number(minAmount);
    if (maxAmount) filter.totalAmount.$lte = Number(maxAmount);
  }

  if (unpaidOnly === "true") {
    filter.totalAmount = { $gt: 0 };
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  // 🔎 SUMMARY MODE (REPORTS)
  if (summary === "true") {
    const report = await Billing.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalBilled: { $sum: "$totalAmount" },
          totalUnits: { $sum: "$unitsConsumed" }
        }
      }
    ]);

    return apiResponse({
      res,
      data: report[0] || {
        totalBills: 0,
        totalBilled: 0,
        totalUnits: 0
      }
    });
  }

  const skip = (page - 1) * limit;

  const [billings, total] = await Promise.all([
    Billing.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip(skip)
      .limit(Number(limit))
      .populate("customerId", "name customerCode phone")
      .populate("approvedBy", "name email")
      .lean(),
    Billing.countDocuments(filter)
  ]);

  return apiResponse({
    res,
    data: billings,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + billings.length < total
    }
  });
};
const getSingleBilling = async (req, res) => {
  const { billingId } = req.params;

  const billing = await Billing.findOne({
    _id: billingId,
    deletedAt: null
  })
    .populate("customerId", "name customerCode phone houseNo")
    .populate("visitId")
    .populate("reversalOf")
    .populate("adjustmentOf")
    .populate("approvedBy", "name email")
    .lean();

  if (!billing)
    return apiResponse({
      res,
      success: false,
      message: "Billing record not found"
    });

  return apiResponse({
    res,
    data: billing
  });
};


const getUnbilledCustomers = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    billingPeriod,
    zoneId,
    villageId,
    customerId,
    reason,
    billingRunId,
    dateFrom,
    dateTo
  } = req.query;

  if (!billingPeriod) {
    return apiResponse({
      res,
      success: false,
      message: "billingPeriod is required"
    });
  }

  const filter = {
    billingPeriod,
    deletedAt: null
  };

  if (customerId) filter.customerId = customerId;
  if (reason) filter.reason = reason;
  if (billingRunId) filter.billingRunId = billingRunId;

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const query = UnbilledCustomer.find(filter)
    .populate({
      path: "customerId",
      select: "name customerCode phone zoneCode villageName houseNo",
      populate: [
        { path: "zoneId",
          select: "name"
        },
        {
          path: "villageId",
          select: "name"
        }
      ]
    })
    .populate("billingRunId", "runType billingPeriod createdAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const [data, total] = await Promise.all([
    query,
    UnbilledCustomer.countDocuments(filter)
  ]);

  // Optional zone / village filtering AFTER population
  const filteredData = data.filter((u) => {
    if (zoneId && u.customerId?.zoneId?._id.toString() !== zoneId) {
      return false;
    }
    if (
      villageId &&
      u.customerId?.villageId?._id.toString() !== villageId
    ) {
      return false;
    }
    return true;
  });

  return apiResponse({
    res,
    data: filteredData,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + filteredData.length < total
    }
  });
};




module.exports = { billCustomersPerZone, billCustomersPerVillage, billAllCustomers, billSingleCustomer, 
  reverseBilling, adjustBilling, tryAutoBillVisit, getBillings, getSingleBilling ,getUnbilledCustomers};


//   const period = await BillingPeriod.findOne({
//   period: billingPeriod,
//   status: "OPEN",
//   deletedAt: null
// });

// if (!period) {
//   return apiResponse({
//     res,
//     success: false,
//     message: "Billing period is closed or locked"
//   });
// }
