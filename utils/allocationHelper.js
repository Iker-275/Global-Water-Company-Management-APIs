const Billing = require("../models/billingModel")
const PaymentAllocation = require("../models/allocation")


const allocatePaymentFIFO = async ({
  customerId,
  paymentId,
  amountCents
}) => {
  let remaining = amountCents;

  const bills = await Billing.find({
    customerId,
    status: { $in: ["ACTIVE", "PARTIAL"] }
  }).sort({ billingPeriod: 1, createdAt: 1 });

  const allocations = [];

  for (const bill of bills) {
    if (remaining <= 0) break;

    const alreadyPaid = await PaymentAllocation.aggregate([
      { $match: { billingId: bill._id } },
      { $group: { _id: null, total: { $sum: "$amountCents" } } }
    ]);

    const paidSoFar = alreadyPaid[0]?.total || 0;
    const billBalance = bill.totalAmount - paidSoFar;

    if (billBalance <= 0) continue;

    const applied = Math.min(remaining, billBalance);

    allocations.push({
      paymentId,
      billingId: bill._id,
      amountCents: applied
    });

    remaining -= applied;

    // Update bill status
    const newPaid = paidSoFar + applied;
    const newStatus =
      newPaid >= bill.totalAmount ? "PAID" : "PARTIAL";

    await Billing.updateOne(
      { _id: bill._id },
      { status: newStatus }
    );
  }

  await PaymentAllocation.insertMany(allocations);

  return {
    allocated: amountCents - remaining,
    remaining
  };
};

module.exports = {allocatePaymentFIFO}