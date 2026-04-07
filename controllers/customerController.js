const Customer = require("../models/customerModel");
const Village = require("../models/villageModel");
const Zone = require("../models/zoneModel");
const User = require("../models/userModel");
const Billing = require("../models/billingModel")
const Payment = require("../models/paymentModel")
const PaymentAllocation = require("../models/allocation")
const allocatePaymentFIFO = require("../utils/allocationHelper")
const { generateCustomerCode } = require("../utils/generateCustomerCode");
const {apiResponse} = require("../utils/apiResponse");
const { createNotification } = require("../services/notificationService");
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

/**
 * CREATE CUSTOMER
 */
const { cleanMoney } = require("../utils/money");

const createCustomer = async (req, res) => {
  const { zoneId, villageId, collectorId, previousBalance } = req.body;

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

  // ✅ SAFE MONEY HANDLING
  const safePreviousBalance = cleanMoney(previousBalance || 0);

  const balances = {
    previousBalance: safePreviousBalance,
    totalPaid: 0,
    expectedTotal: safePreviousBalance,
    unpaid: safePreviousBalance
  };

  const customer = await Customer.create({
    ...req.body,
    collectorName: collector ? collector.email : null,
    collectorId: collector ? collector._id : null,
    customerCode,
    zoneCode: zone.code,
    zoneId: zone._id,
    zoneName: zone.name,
    villageName: village.name,
    villageId: village._id,
    status: "active",
    balances
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
// const createCustomer = async (req, res) => {
//   const { zoneId, villageId ,collectorId,phone,name,previousBalance} = req.body;

// //   const existingCustomer = await Customer.findOne({
// //   phone,
// //   deletedAt: null
// // });

// // if (existingCustomer){
// //   return apiResponse({
// //     res,
// //     success: false,
// //     message: "Customer with this phone number already exists"
// //   });
// // }

//   const zone = await Zone.findOne({ _id: zoneId, deletedAt: null });
//   const village = await Village.findOne({ _id: villageId, deletedAt: null });

//   if (!zone || !village)
//     return apiResponse({
//       res,
//       success: false,
//       message: "Invalid zone or village"
//     });


//   let collector = null;

//   if (collectorId) {
//     collector = await User.findOne({
//       _id: collectorId,
//       deletedAt: null
//     });

//     if (!collector)
//       return apiResponse({
//         res,
//         success: false,
//         message: "Collector user not found"
//       });

//     if (collector.active !== true)
//       return apiResponse({
//         res,
//         success: false,
//         message: "Collector user is not active"
//       });

//     if (!["user", "employee", "admin"].includes(collector.role))
//       return apiResponse({
//         res,
//         success: false,
//         message: "User is not authorized as a collector"
//       });
//   }

//   const customerCode = await generateCustomerCode(
//     zone.code,
//     village.code
//   );

//   const customer = await Customer.create({
//     ...req.body,
//     collectorName: collector ? collector.email : null,
//     collectorId: collector ? collector._id : null,
//     customerCode,
//     zoneCode: zone.code,
//     zoneId: zone._id,
//     zoneName: zone.name,
//     villageName: village.name,
//     villageId: village._id,
//     status: "active",
//     balances: {
//       previousBalance: previousBalance ? Number(previousBalance) : 0,
//       totalPaid: 0,
//       unpaid: previousBalance ? Number(previousBalance) : 0,
//       expectedTotal: 0
//     }
//   });

//   await createNotification({
//     type: "CUSTOMER_CREATED",
//     message: `Customer ${customer.name} onboarded`,
//     targetRoles: ["admin", "system"],
//     relatedEntity: {
//       entityType: "customer",
//       entityId: customer._id
//     }
//   });

//   return apiResponse({
//     res,
//     message: "Customer created successfully",
//     data: customer
//   });
// };

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
    dateFrom,
    dateTo
  } = req.query;

  const filter = { deletedAt: null };

  if (zoneId) filter.zoneId = zoneId;
  if (villageId) filter.villageId = villageId;
  if (customerCode) filter.customerCode = customerCode;
  if (status) filter.status = status;
  if (collectorId) filter.collectorId = collectorId;

  if (phone)
    filter.phone = { $regex: phone, $options: "i" };

  if (name)
    filter.name = { $regex: name, $options: "i" };

  // Balance filters (note: balances.unpaid is nested)
  if (hasBalance === "true")
    filter["balances.unpaid"] = { $gt: 0 };

  if (hasBalance === "false")
    filter["balances.unpaid"] = 0;

  if (minBalance || maxBalance) {
    filter["balances.unpaid"] = {};
    if (minBalance) filter["balances.unpaid"].$gte = Number(minBalance);
    if (maxBalance) filter["balances.unpaid"].$lte = Number(maxBalance);
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;

  const projection = `
    customerCode
    houseNo
    name
    phone
    purpose
    businessName
    zoneId
    zoneCode
    zoneName
    villageId
    villageName
    collectorName
    status
    createdAt
    updatedAt
    meter.meterNo
  meter.currentReading
  meter.lastReadAt
  balances.unpaid
  `;

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .select(projection)   // ✅ Hides meter & balances
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean(),              // 🚀 Faster JSON response
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
// const updateCustomer = async (req, res) => {

//   const { zoneId, villageId ,phone,name} = req.body;

//   //   if (phone || name) {
//   //   const duplicate = await Customer.findOne({
//   //     _id: { $ne: req.params.id },
//   //     phone: phone,
//   //     name: name
//   //       ? { $regex: `^${name}$`, $options: "i" }
//   //       : undefined,
//   //     deletedAt: null
//   //   });

//   //   if (duplicate)
//   //     return apiResponse({
//   //       res,
//   //       success: false,
//   //       message: "Another customer with same name and phone already exists"
//   //     });
//   // }

//   if (zoneId || villageId) {
//     const zone = zoneId
//       ? await Zone.findOne({ _id: zoneId, deletedAt: null })
//       : null;

//     const village = villageId
//       ? await Village.findOne({ _id: villageId, deletedAt: null })
//       : null;

//     if (zoneId && !zone)
//       return apiResponse({ res, success: false, message: "Invalid zone" });

//     if (villageId && !village)
//       return apiResponse({ res, success: false, message: "Invalid village" });

//     if (zone) zoneCode = zone.code;
//     if (village) villageName = village.name;
//   }

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

//   return apiResponse({
//     res,
//     message: "Customer updated successfully",
//     data: customer
//   });
// };



const updateCustomer = async (req, res) => {
  const { zoneId, villageId, previousBalance } = req.body;

  const updateData = { ...req.body };

  // ❌ NEVER allow direct overwrite of computed fields
  delete updateData.balances;

  // -----------------------------
  // Validate zone & village
  // -----------------------------
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

    if (zone) {
      updateData.zoneCode = zone.code;
      updateData.zoneName = zone.name;
      updateData.zoneId = zone._id;
    }

    if (village) {
      updateData.villageName = village.name;
      updateData.villageId = village._id;
    }
  }

  // -----------------------------
  // Fetch current customer
  // -----------------------------
  const existingCustomer = await Customer.findOne({
    _id: req.params.id,
    deletedAt: null
  });

  if (!existingCustomer)
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });

  // -----------------------------
  // 💰 Handle balance updates safely
  // -----------------------------
  if (previousBalance !== undefined) {
    const safePreviousBalance = cleanMoney(previousBalance);

    const totalPaid = existingCustomer.balances?.totalPaid || 0;

    const expectedTotal = cleanMoney(safePreviousBalance);
    const unpaid = cleanMoney(expectedTotal - totalPaid);

    updateData.balances = {
      ...existingCustomer.balances,
      previousBalance: safePreviousBalance,
      expectedTotal,
      unpaid
    };
  }

  // -----------------------------
  // Update customer
  // -----------------------------
  const customer = await Customer.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    updateData,
    { new: true }
  );

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



const uploadCustomersFromExcel = async (req, res) => {
  if (!req.file)
    return apiResponse({ res, success: false, message: "No file uploaded" });

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const sheet = workbook.Sheets["customers"];

  if (!sheet)
    return apiResponse({
      res,
      success: false,
      message: "Excel sheet must be named 'customers'"
    });

  const rows = XLSX.utils.sheet_to_json(sheet);

  const inserted = [];
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      /* ---------- ZONE & VILLAGE ---------- */
      const zone = await Zone.findOne({ _id: row.zoneId, deletedAt: null });
      const village = await Village.findOne({ _id: row.villageId, deletedAt: null });

      if (!zone || !village)
        throw new Error("Invalid zone or village");

      /* ---------- DUPLICATE CHECK ---------- */
      const existing = await Customer.findOne({
        phone: row.phone,
        name: { $regex: `^${row.name}$`, $options: "i" },
        deletedAt: null
      });

      if (existing)
        throw new Error("Duplicate customer");

      /* ---------- COLLECTOR ---------- */
      let collector = null;
      if (row.collectorId) {
        collector = await User.findOne({
          _id: row.collectorId,
          deletedAt: null,
          active: true
        });

        if (!collector)
          throw new Error("Invalid or inactive collector");
      }

      /* ---------- BALANCES ---------- */
      const previousBalance = Number(row.previousBalance || 0);
      const expectedTotal = Number(row.expectedTotal || 0);
      const totalPaid = Number(row.totalPaid || 0);

      const unpaid = previousBalance + expectedTotal - totalPaid;

      /* ---------- CUSTOMER CODE ---------- */
      const customerCode = await generateCustomerCode(zone.code, village.code);

      /* ---------- CREATE CUSTOMER ---------- */
      const customer = await Customer.create({
        houseNo: row.houseNo,
        phone: row.phone,
        name: row.name,
        purpose: row.purpose,
        businessName: row.businessName || "",
        customerCode,
        zoneId: zone._id,
        zoneCode: zone.code,
        villageId: village._id,
        villageName: village.name,
        collectorId: collector ? collector._id : null,
        collectorName: collector ? collector.email : null,
        meter: {
          meterNo: row.meterNo,
          initialReading: row.initialReading || 0,
          currentReading: row.currentReading || 0,
          readings: []
        },
        balances: {
          previousBalance,
          expectedTotal,
          totalPaid,
          unpaid
        },
        status: row.status || "active"
      });

      inserted.push(customer._id);
    } catch (error) {
      failed.push({
        row: i + 2, // Excel row number
        phone: row.phone,
        reason: error.message
      });
    }
  }

  /* ---------- SINGLE NOTIFICATION ---------- */
  await createNotification({
    type: "CUSTOMER_BULK_UPLOAD",
    message: `${inserted.length} customers imported, ${failed.length} failed`,
    targetRoles: ["admin", "system"]
  });

  return apiResponse({
    res,
    message: "Bulk upload completed",
    data: {
      insertedCount: inserted.length,
      failedCount: failed.length,
      failed
    }
  });
};

const getCustomerStatement = async (req, res) => {
  const { id } = req.params;
  const { fromDate, toDate } = req.query;

  

  const customer = await Customer.findById(id)
    .select("name meterNumber zone village");

    
    

  if (!customer) {
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });
  }

  const billQuery = {
    "customerId":id,
    status: { $in: ["ACTIVE", "ADJUSTED","MANUAL","PAID"] }
  };


  const paymentQuery = {
    "customerId":id,
  };

  if (fromDate || toDate) {
    const dateFilter = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) dateFilter.$lte = new Date(toDate);

    billQuery.createdAt = dateFilter;
    paymentQuery.createdAt = dateFilter;
  }

  const bills = await Billing.find(billQuery).lean();
  const payments = await Payment.find(paymentQuery).lean();

  
  

  /** Normalize to statement entries */
  const entries = [];

  
  bills.forEach(bill => {
    
    if (bill.status === "REVERSED") {
      entries.push({
        date: bill.updatedAt,
        type: "REVERSAL",
        referenceId: bill._id,
        description: `Bill reversed (${bill.billingPeriod})`,
        debit: 0,
        credit: bill.totalAmount
      });
    } else {
      entries.push({
        date: bill.createdAt,
        type: bill.billingType === "ADJUSTMENT" ? "ADJUSTMENT" : "BILL",
        referenceId: bill._id,
        description: bill.billingType === "ADJUSTMENT"
          ? `Adjustment: ${bill.reason}`
          : `Billing for ${bill.billingPeriod}`,
        debit: bill.totalAmount,
        credit: 0
      });
    }
  });

  // payments.forEach(payment => {
  //   if (payment.status === "CANCELLED") {
  //     entries.push({
  //       date: payment.cancelledAt,
  //       type: "PAYMENT_CANCELLED",
  //       referenceId: payment._id,
  //       description: `Payment cancelled: ${payment.cancelReason}`,
  //       debit: payment.amountCents,
  //       credit: 0
  //     });
  //   } else {
  //     entries.push({
  //       date: payment.createdAt,
  //       type: "PAYMENT",
  //       referenceId: payment._id,
  //       description: `Payment received`,
  //       debit: 0,
  //       credit: payment.amountCents
  //     });
  //   }
  // });
payments.forEach(payment => {
  // 1️⃣ Normal payment (even if later cancelled)
  if (payment.method !== "ADJUSTMENT") {
    entries.push({
      date: payment.createdAt,
      type: payment.status === "CANCELLED"
        ? "PAYMENT (CANCELLED)"
        : "PAYMENT",
      referenceId: payment._id,
      description:
        payment.status === "CANCELLED"
          ? "Payment received (later cancelled)"
          : "Payment received",
      debit: 0,
      credit: payment.amountCents
    });
  }

  // 2️⃣ Adjustment entry (reversal)
  if (payment.method === "ADJUSTMENT") {
    entries.push({
      date: payment.createdAt,
      type: "ADJUSTMENT",
      referenceId: payment._id,
      description: `Payment reversal: ${payment.reason || "Adjustment"}`,
      debit: Math.abs(payment.amountCents),
      credit: 0
    });
  }
});


  /** Sort chronologically */
  entries.sort((a, b) => new Date(a.date) - new Date(b.date));

  /** Compute running balance */
  let runningBalance = 0;
  const statement = entries.map(entry => {
    runningBalance += entry.debit;
    runningBalance -= entry.credit;

    

    return {
      ...entry,
      balance: runningBalance
    };
  });

  const openingBalance = 0;
const closingBalance = runningBalance;

  return apiResponse({
    res,
    data: {
      customer,
      openingBalance: statement.length ? statement[0].balance - (statement[0].debit - statement[0].credit) : 0,
      closingBalance: runningBalance,
      statement
    }
  });
};


/**
 * TOGGLE CUSTOMER STATUS (ACTIVE ↔ DISCONNECTED)
 */
const toggleCustomerStatus = async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    deletedAt: null
  });

  if (!customer) {
    return apiResponse({
      res,
      success: false,
      message: "Customer not found"
    });
  }

  // Optional safety: block disconnect if unpaid balance exists
  if (
    customer.status === "active" &&
    customer.balances?.unpaid > 0
  ) {
    return apiResponse({
      res,
      success: false,
      message: "Customer cannot be disconnected with outstanding balance"
    });
  }

  const newStatus =
    customer.status === "active" ? "disconnected" : "active";

  customer.status = newStatus;
  await customer.save();

  await createNotification({
    type: "CUSTOMER_STATUS_CHANGED",
    message: `Customer ${customer.name} is now ${newStatus.toLowerCase()}`,
    targetRoles: ["admin"],
    relatedEntity: {
      entityType: "customer",
      entityId: customer._id
    }
  });

  return apiResponse({
    res,
    message: `Customer status updated to ${newStatus}`,
    data: {
      id: customer._id,
      status: customer.status
    }
  });
};


const getCustomersReport = async (req, res) => {
  try {
    const {
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
      dateFrom,
      dateTo
    } = req.query;

    const filter = { deletedAt: null };

    if (zoneId) filter.zoneId = zoneId;
    if (villageId) filter.villageId = villageId;
    if (customerCode) filter.customerCode = customerCode;
    if (status) filter.status = status;
    if (collectorId) filter.collectorId = collectorId;

    if (phone) filter.phone = { $regex: phone, $options: "i" };
    if (name) filter.name = { $regex: name, $options: "i" };

    if (hasBalance === "true") filter["balances.unpaid"] = { $gt: 0 };
    if (hasBalance === "false") filter["balances.unpaid"] = 0;

    if (minBalance || maxBalance) {
      filter["balances.unpaid"] = {};
      if (minBalance) filter["balances.unpaid"].$gte = Number(minBalance);
      if (maxBalance) filter["balances.unpaid"].$lte = Number(maxBalance);
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const customers = await Customer.find(filter)
      .select(`
        villageName
        name
        phone
        houseNo
        balances.unpaid
        meter.meterNo
        meter.lastReadAt
        status
      `)
      .sort({ villageName: 1 })
      .lean();

    /* ---------------- PDF ---------------- */

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=customers-report.pdf"
    );

    doc.pipe(res);

    /* -------- HEADER -------- */

    doc
      .fontSize(18)
      .text("GALDOGOB WATER COMPANY", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(14)
      .text("Customers Report", { align: "center" });

    doc
      .fontSize(9)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });

    doc.moveDown(2);

    /* -------- TABLE HEADER -------- */

    const tableTop = doc.y;
    const colX = [40, 140, 300, 420, 500, 560, 640, 700];

    doc.fontSize(10).font("Helvetica-Bold");

    doc.text("Village", colX[0], tableTop);
    doc.text("Name", colX[1], tableTop);
    doc.text("Phone", colX[2], tableTop);
    doc.text("House No", colX[3], tableTop);
    doc.text("Balance", colX[4], tableTop);
    doc.text("Meter No", colX[5], tableTop);
    doc.text("Status", colX[6], tableTop);
    doc.text("Last Read", colX[7], tableTop);

    doc.moveTo(40, tableTop + 15)
       .lineTo(800, tableTop + 15)
       .stroke();

    /* -------- TABLE ROWS -------- */

    let y = tableTop + 25;

    doc.font("Helvetica").fontSize(9);

    customers.forEach((c) => {
      const lastRead = c.meter?.lastReadAt
        ? new Date(c.meter.lastReadAt).toLocaleDateString()
        : "";

      const balance = Number(c.balances?.unpaid ?? 0).toFixed(2);

      doc.text(c.villageName ?? "", colX[0], y);
      doc.text(c.name ?? "", colX[1], y);
      doc.text(c.phone ?? "", colX[2], y);
      doc.text(c.houseNo ?? "", colX[3], y);
      doc.text(balance, colX[4], y);
      doc.text(c.meter?.meterNo ?? "", colX[5], y);
      doc.text(c.status ?? "", colX[6], y);
      doc.text(lastRead, colX[7], y);

      y += 20;

      if (y > 520) {
        doc.addPage();
        y = 40;
      }
    });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate customer report" });
  }
};





module.exports = {  createCustomer, getCustomers, getCustomerById, updateCustomer, deleteCustomer ,uploadCustomersFromExcel,getCustomerStatement,toggleCustomerStatus,getCustomersReport};