const Customer = require("../models/customerModel")
const Billing = require("../models/billingModel")

const Payment = require("../models/paymentModel")
const PaymentAllocation = require("../models/allocation")
const { allocatePaymentFIFO ,reversePaymentAllocations } = require("../utils/allocationHelper")
const { apiResponse } = require("../utils/apiResponse")
const { createNotification } = require('../services/notificationService');
const PDFDocument = require("pdfkit");



const paySingleCustomer = async (req, res) => {
  const { customerId, amountCents, method, reference, userId } = req.body;

  if (!customerId || !amountCents || !method)
    return apiResponse({
      res,
      success: false,
      message: "customerId, amount, method required"
    });

  const customer = await Customer.findById(customerId);
  if (!customer)
    return apiResponse({ res, success: false, message: "Customer not found" });

  const payment = await Payment.create({
    customerId,
    zoneId: customer.zoneId,
    villageId: customer.villageId,
    amountCents,
    method,
    reference,
    createdBy: userId
  });


  const { allocated } = await allocatePaymentFIFO({
    customerId,
    paymentId: payment._id,
    amountCents
  });



  await Customer.updateOne(
    { _id: customerId },
    {
      $inc: {
        "balances.totalPaid": allocated,
        "balances.unpaid": -allocated
      }
    }
  );


  await createNotification({
    type: "CUSTOMER_PAYMENT",
    message: `Customer ${customer.name} payment made`,
    targetRoles: ["admin", "system"]
  });

  return apiResponse({
    res,
    message: "Payment recorded successfully",
    data: payment
  });
};


const bulkClearPayments = async (req, res) => {
  const { customerIds, method, userId } = req.body;

  if (!Array.isArray(customerIds) || !method)
    return apiResponse({
      res,
      success: false,
      message: "customerIds[] and method required"
    });

  const results = [];

  for (const customerId of customerIds) {
    const customer = await Customer.findById(customerId);
    if (!customer || customer.balances.unpaid <= 0) continue;

    const payment = await Payment.create({
      customerId,
      zoneId: customer.zoneId,
      villageId: customer.villageId,
      amountCents: customer.balances.unpaid,
      method,
      createdBy: userId
    });

    await allocatePaymentFIFO({
      customerId,
      paymentId: payment._id,
      amountCents: customer.balances.unpaid
    });

    await Customer.updateOne(
      { _id: customerId },
      {
        $set: {
          "balances.unpaid": 0
        },
        $inc: {
          "balances.totalPaid": customer.balances.unpaid
        }
      }
    );

    results.push(payment._id);
  }

  await createNotification({
    type: "CUSTOMER_BULK_PAYMENT",
    message: `Customer Bulk payment made`,
    targetRoles: ["admin", "system"]
  });

  return apiResponse({
    res,
    message: "Bulk payments completed",
    data: results
  });
};


// const cancelPayment = async (req, res) => {
//   const { id } = req.params;
//   const { reason, userId } = req.body;

//   const payment = await Payment.findOne({
//     _id: id,
//     status: "ACTIVE"
//   });

//   if (!payment)
//     return apiResponse({
//       res,
//       success: false,
//       message: "Active payment not found"
//     });

//   const allocations = await PaymentAllocation.find({
//     paymentId: payment._id
//   });

//   for (const alloc of allocations) {
//     await Billing.updateOne(
//       { _id: alloc.billingId },
//       { status: "ACTIVE" }
//     );
//   }

//   await Customer.updateOne(
//     { _id: payment.customerId },
//     {
//       $inc: {
//         "balances.unpaid": payment.amountCents,
//         "balances.totalPaid": -payment.amountCents
//       }
//     }
//   );

//   await Payment.create({
//     customerId: payment.customerId,
//     amountCents: -payment.amountCents,
//     method: "ADJUSTMENT",
//     reversalOf: payment._id,
//     reason,
//     createdBy: userId
//   });

//   await Payment.updateOne(
//     { _id: payment._id },
//     { status: "CANCELLED" }
//   );

//    await createNotification({
//         type: "CUSTOMER_PAYMENT_CANCELLED",
//         message: `Customer ${payment.customerId} payment cancelled`,
//         targetRoles: ["admin","system"]
//       });

//   return apiResponse({
//     res,
//     message: "Payment cancelled successfully"
//   });
// };






const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, userId } = req.body;

    const payment = await Payment.findOne({
      _id: id,
      status: "ACTIVE"
    });

    if (!payment)
      return apiResponse({
        res,
        success: false,
        message: "Active payment not found"
      });

    // Reverse allocations
    await reversePaymentAllocations({
      paymentId: payment._id
    });

    // Create adjustment payment record
    await Payment.create({
      customerId: payment.customerId,
      zoneId: payment.zoneId,
      villageId: payment.villageId,
      amountCents: -payment.amountCents,
      method: "ADJUSTMENT",
      reversalOf: payment._id,
      reason,
      createdBy: userId
    });

    // Restore balances
    await Customer.updateOne(
      { _id: payment.customerId },
      {
        $inc: {
          "balances.totalPaid": -payment.amountCents,
          "balances.unpaid": payment.amountCents
        }
      }
    );

    // Mark payment cancelled
    await Payment.updateOne(
      { _id: payment._id },
      { status: "CANCELLED" }
    );

    await createNotification({
      type: "CUSTOMER_PAYMENT_CANCELLED",
      message: `Payment cancelled for customer ${payment.customerId}`,
      targetRoles: ["admin", "system"]
    });

    return apiResponse({
      res,
      message: "Payment cancelled successfully"
    });

  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message,
      statusCode: 500
    });
  }
};






const getPayments = async (req, res) => {
  try {
    const {
      customerId,
      zoneId,
      villageId,
      method,
      from,
      to,
      status,
      page = 1,
      limit = 10
    } = req.query;

    const filter = { deletedAt: null };

    if (customerId) filter.customerId = customerId;
    if (zoneId) filter.zoneId = zoneId;
    if (villageId) filter.villageId = villageId;
    if (method) filter.method = method;
    if (status) filter.status = status;

    if (from || to) {
      filter.receivedAt = {};
      if (from) filter.receivedAt.$gte = new Date(from);
      if (to) filter.receivedAt.$lte = new Date(to);
    }

    const pageNumber = Number(page);
    const pageLimit = Number(limit);
    const skip = (pageNumber - 1) * pageLimit;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("customerId", "name customerCode")
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Payment.countDocuments(filter)
    ]);

    return apiResponse({
      res,
      data: payments,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
        hasNextPage: skip + payments.length < total,
        hasPrevPage: pageNumber > 1
      }
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message,
      statusCode: 500
    });
  }
};

const getSinglePayment = async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findById(id)
    .populate("customerId", "name")
    .populate("createdBy", "name");

  if (!payment)
    return apiResponse({
      res,
      success: false,
      message: "Payment not found"
    });

  const allocations = await PaymentAllocation.find({
    paymentId: id
  }).populate("billingId");

  return apiResponse({
    res,
    data: { payment, allocations }
  });
};


const generatePaymentsReportPDF = async (req, res) => {
  try {
    const {
      customerId,
      zoneId,
      villageId,
      method,
      status,
      from,
      to,
      month,
      year
    } = req.query;

    const filter = { deletedAt: null };

    if (customerId) filter.customerId = customerId;
    if (zoneId) filter.zoneId = zoneId;
    if (villageId) filter.villageId = villageId;
    if (method) filter.method = method;
    if (status) filter.status = status;

    if (from || to) {
      filter.receivedAt = {};
      if (from) filter.receivedAt.$gte = new Date(from);
      if (to) filter.receivedAt.$lte = new Date(to);
    }

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);

      filter.receivedAt = { $gte: start, $lte: end };
    }

    if (year && !month) {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);

      filter.receivedAt = { $gte: start, $lte: end };
    }

    const payments = await Payment.find(filter)
      .populate("customerId", "name customerCode")
      .sort({ receivedAt: -1 })
      .lean();

    const totalAmount = payments.reduce(
      (sum, p) => sum + (p.amountCents || 0),
      0
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=payments-report.pdf"
    );

    doc.pipe(res);

    // HEADER
    doc
      .fontSize(20)
      .text("GALDOGOB WATER COMPANY", { align: "center" });

    doc
      .fontSize(16)
      .text("PAYMENTS COLLECTION REPORT", { align: "center" });

    doc.moveDown();

    doc.fontSize(11);

    if (from) doc.text(`From: ${from}`);
    if (to) doc.text(`To: ${to}`);
    if (month) doc.text(`Month: ${month}`);
    if (year) doc.text(`Year: ${year}`);

    doc.text(`Generated At: ${new Date().toLocaleString()}`);

    doc.moveDown();

    doc.text(`Total Transactions: ${payments.length}`);
    doc.text(`Total Amount: ${totalAmount.toFixed(2)} USD`);

    doc.moveDown();

    const tableTop = 200;
    const rowHeight = 20;

    const headers = [
      "No",
      "Date",
      // "Customer Code",
      "Customer Name",
      "Method",
      "Amount",
      "Status"
    ];

    const colX = [40, 80, 160, 290, 380, 460];

    headers.forEach((h, i) => {
      doc.font("Helvetica-Bold").text(h, colX[i], tableTop);
    });

    let y = doc.y + 10;

    payments.forEach((p, index) => {
      const c = p.customerId || {};

      doc.font("Helvetica");

      doc.text(index + 1, colX[0], y);
      doc.text(new Date(p.receivedAt).toLocaleDateString(), colX[1], y);
      // doc.text(c.customerCode || "", colX[2], y);
      doc.text(c.name || "", colX[2], y);
      doc.text(p.method || "", colX[3], y);
      doc.text(p.amountCents.toFixed(2), colX[4], y);
      doc.text(p.status || "", colX[5], y);

      y += 20;

      if (y > 750) {
        doc.addPage();
        y = 50;
      }
    });

    doc.moveDown(2);
    doc.text(`TOTAL COLLECTED: ${totalAmount.toFixed(2)} USD`);

    doc.end();
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};


module.exports = { getSinglePayment, getPayments, cancelPayment, bulkClearPayments, paySingleCustomer, generatePaymentsReportPDF };