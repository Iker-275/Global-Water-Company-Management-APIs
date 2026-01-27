const Customer = require("../models/customerModel")
const Billing = require("../models/billingModel")

const Payment = require("../models/paymentModel")
const PaymentAllocation = require("../models/allocation")
const { allocatePaymentFIFO }= require("../utils/allocationHelper")
const { apiResponse } = require("../utils/apiResponse")


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

  return apiResponse({
    res,
    message: "Bulk payments completed",
    data: results
  });
};


const cancelPayment = async (req, res) => {
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

  const allocations = await PaymentAllocation.find({
    paymentId: payment._id
  });

  for (const alloc of allocations) {
    await Billing.updateOne(
      { _id: alloc.billingId },
      { status: "ACTIVE" }
    );
  }

  await Customer.updateOne(
    { _id: payment.customerId },
    {
      $inc: {
        "balances.unpaid": payment.amountCents,
        "balances.totalPaid": -payment.amountCents
      }
    }
  );

  await Payment.create({
    customerId: payment.customerId,
    amountCents: -payment.amountCents,
    method: "ADJUSTMENT",
    reversalOf: payment._id,
    reason,
    createdBy: userId
  });

  await Payment.updateOne(
    { _id: payment._id },
    { status: "CANCELLED" }
  );

  return apiResponse({
    res,
    message: "Payment cancelled successfully"
  });
};


const getPayments = async (req, res) => {
  const {
    customerId,
    zoneId,
    villageId,
    method,
    from,
    to,
    status
  } = req.query;

  const filter = {};

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

  const payments = await Payment.find(filter)
    .populate("customerId", "name accountNumber")
    .sort({ receivedAt: -1 });

  return apiResponse({
    res,
    data: payments
  });
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


module.exports={getSinglePayment,getPayments,cancelPayment,bulkClearPayments,paySingleCustomer};