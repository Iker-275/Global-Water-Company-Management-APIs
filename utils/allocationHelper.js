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
    status: { $in: ["ACTIVE", "PARTIAL", "ADJUSTED"] }
  })
  .sort({ billingPeriod: 1, createdAt: 1 });
  


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




const reversePaymentAllocations = async ({ paymentId }) => {

  // Find allocations tied to this payment
  const allocations = await PaymentAllocation.find({ paymentId });

  for (const alloc of allocations) {

    // Delete allocation
    await PaymentAllocation.deleteOne({ _id: alloc._id });

    const bill = await Billing.findById(alloc.billingId);

    if (!bill) continue;

    // Recalculate paid amount
    const remainingPaid = await PaymentAllocation.aggregate([
      { $match: { billingId: bill._id } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountCents" }
        }
      }
    ]);

    const paid = remainingPaid[0]?.total || 0;

    let newStatus = "ACTIVE";

    if (paid > 0 && paid < bill.totalAmount) {
      newStatus = "PARTIAL";
    }

    if (paid >= bill.totalAmount) {
      newStatus = "PAID";
    }

    await Billing.updateOne(
      { _id: bill._id },
      { status: newStatus }
    );
  }

  return { reversedAllocations: allocations.length };
};





module.exports = { allocatePaymentFIFO ,reversePaymentAllocations}