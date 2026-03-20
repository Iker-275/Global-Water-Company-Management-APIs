
const Visit = require("../models/visitModel");
const Customer = require("../models/customerModel");
const Payment = require("../models/paymentModel");
const Billing = require("../models/billingModel");
const { apiResponse } = require("../utils/apiResponse");

// const getDashboard = async (req, res) => {
//   try {
//     const now = new Date();

//     // 📅 Current month range
//     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
//     const endOfMonth = new Date(
//       now.getFullYear(),
//       now.getMonth() + 1,
//       0,
//       23,
//       59,
//       59
//     );

//     const currentMonth = `${now.getFullYear()}-${String(
//       now.getMonth() + 1
//     ).padStart(2, "0")}`;

//     const baseFilter = { deletedAt: null };

//     // 📊 Trend config
//     const monthsBack = 6;
//     const startDate = new Date(
//       now.getFullYear(),
//       now.getMonth() - monthsBack + 1,
//       1
//     );

//     // 🚀 Parallel queries
//     const [
//       // VISITS
//       totalVisits,
//       recentVisits,

//       // CUSTOMERS
//       totalCustomers,

//       // PAYMENTS (MONTH)
//       paymentsAgg,
//       recentPayments,

//       // BILLINGS (MONTH)
//       billingAgg,

//       // TRENDS
//       billingTrend,
//       paymentsTrend

//     ] = await Promise.all([
//       // Visits this month
//       Visit.countDocuments({
//         ...baseFilter,
//         visitedAt: { $gte: startOfMonth, $lte: endOfMonth }
//       }),

//       // Recent visits
//       Visit.find(baseFilter)
//         .sort({ visitedAt: -1 })
//         .limit(5)
//         .populate("customerId", "name customerCode")
//         .lean(),

//       // Total customers
//       Customer.countDocuments(baseFilter),

//       // Payments this month
//       Payment.aggregate([
//         {
//           $match: {
//             ...baseFilter,
//             receivedAt: { $gte: startOfMonth, $lte: endOfMonth }
//           }
//         },
//         {
//           $group: {
//             _id: null,
//             totalPayments: { $sum: "$amountCents" },
//             count: { $sum: 1 }
//           }
//         }
//       ]),

//       // Recent payments
//       Payment.find(baseFilter)
//         .sort({ receivedAt: -1 })
//         .limit(5)
//         .populate("customerId", "name customerCode")
//         .lean(),

//       // Billing this month
//       Billing.aggregate([
//         {
//           $match: {
//             ...baseFilter,
//             createdAt: { $gte: startOfMonth, $lte: endOfMonth }
//           }
//         },
//         {
//           $group: {
//             _id: null,
//             totalBilled: { $sum: "$totalAmount" }
//           }
//         }
//       ]),

//       // Billing trend
//       Billing.aggregate([
//         {
//           $match: {
//             deletedAt: null,
//             createdAt: { $gte: startDate }
//           }
//         },
//         {
//           $group: {
//             _id: {
//               year: { $year: "$createdAt" },
//               month: { $month: "$createdAt" }
//             },
//             totalBilled: { $sum: "$totalAmount" }
//           }
//         }
//       ]),

//       // Payment trend
//       Payment.aggregate([
//         {
//           $match: {
//             deletedAt: null,
//             receivedAt: { $gte: startDate }
//           }
//         },
//         {
//           $group: {
//             _id: {
//               year: { $year: "$receivedAt" },
//               month: { $month: "$receivedAt" }
//             },
//             totalPaid: { $sum: "$amountCents" }
//           }
//         }
//       ])
//     ]);

//     // 🧠 Extract safe values
//     const totalPayments = paymentsAgg[0]?.totalPayments || 0;
//     const paymentsCount = paymentsAgg[0]?.count || 0;
//     const totalBilled = billingAgg[0]?.totalBilled || 0;

//     // 🔄 Build trend maps
//     const billingMap = {};
//     const paymentMap = {};

//     billingTrend.forEach(b => {
//       const key = `${b._id.year}-${String(b._id.month).padStart(2, "0")}`;
//       billingMap[key] = b.totalBilled;
//     });

//     paymentsTrend.forEach(p => {
//       const key = `${p._id.year}-${String(p._id.month).padStart(2, "0")}`;
//       paymentMap[key] = p.totalPaid;
//     });

//     // 📈 Final trend array
//     const billingVsPaymentsTrend = [];

//     for (let i = 0; i < monthsBack; i++) {
//       const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

//       const key = `${d.getFullYear()}-${String(
//         d.getMonth() + 1
//       ).padStart(2, "0")}`;

//       billingVsPaymentsTrend.unshift({
//         month: key,
//         billed: billingMap[key] || 0,
//         paid: paymentMap[key] || 0
//       });
//     }

//     // ✅ Final response
//     return apiResponse({
//       res,
//       data: {
//         currentMonth,

//         visits: {
//           total: totalVisits,
//           recent: recentVisits
//         },

//         customers: {
//           total: totalCustomers
//         },

//         billingVsPayments: {
//           totalBilled,
//           totalPayments
//         },

//         billingVsPaymentsTrend,

//         payments: {
//           total: paymentsCount,
//           recent: recentPayments
//         }
//       }
//     });

//   } catch (error) {
//     return apiResponse({
//       res,
//       success: false,
//       message: error.message,
//       statusCode: 500
//     });
//   }
// };



const getDashboard = async (req, res) => {
  try {
    const now = new Date();

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    // -----------------------------
    // VISITS (MONTH + RECENT)
    // -----------------------------
    const [monthlyVisitsCount, recentVisits] = await Promise.all([
      Visit.countDocuments({
        deletedAt: null,
        visitedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),

      Visit.find({ deletedAt: null })
        .sort({ visitedAt: -1 })
        .limit(5)
        .populate("customerId", "name customerCode")
        .lean()
    ]);

    // -----------------------------
    // TOTAL CUSTOMERS
    // -----------------------------
    const totalCustomers = await Customer.countDocuments({
      deletedAt: null
    });

    // -----------------------------
    // MONTHLY BILLINGS & PAYMENTS
    // -----------------------------
    const [monthlyBillingAgg, monthlyPaymentsAgg] = await Promise.all([
      Billing.aggregate([
        {
          $match: {
            deletedAt: null,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]),

      Payment.aggregate([
        {
          $match: {
            deletedAt: null,
            status: "ACTIVE",
            receivedAt: { $gte: startOfMonth, $lte: endOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amountCents" }
          }
        }
      ])
    ]);

    const monthlyBilled = monthlyBillingAgg[0]?.total || 0;
    const monthlyPaid = monthlyPaymentsAgg[0]?.total || 0;

    // -----------------------------
    // 🔥 GLOBAL BILLINGS VS PAYMENTS (FIXED)
    // -----------------------------
    const [globalBillingAgg, globalPaymentsAgg] = await Promise.all([
      Billing.aggregate([
        {
          $match: { deletedAt: null }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" }
          }
        }
      ]),

      Payment.aggregate([
        {
          $match: {
            deletedAt: null,
            status: "ACTIVE"
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amountCents" }
          }
        }
      ])
    ]);

    const totalBilled = globalBillingAgg[0]?.total || 0;
    const totalPayments = globalPaymentsAgg[0]?.total || 0;

    // -----------------------------
    // RECENT PAYMENTS + MONTH COUNT
    // -----------------------------
    const [monthlyPaymentsCount, recentPayments] = await Promise.all([
      Payment.countDocuments({
        deletedAt: null,
        status: "ACTIVE",
        receivedAt: { $gte: startOfMonth, $lte: endOfMonth }
      }),

      Payment.find({ deletedAt: null })
        .sort({ receivedAt: -1 })
        .limit(5)
        .populate("customerId", "name customerCode")
        .lean()
    ]);

    // -----------------------------
    // 📊 BILLING VS PAYMENT TREND (LAST 6 MONTHS)
    // -----------------------------
    const months = [];
    const trend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const label = `${d.getFullYear()}-${String(
        d.getMonth() + 1
      ).padStart(2, "0")}`;

      months.push({ start, end, label });
    }

    for (const m of months) {
      const [billedAgg, paidAgg] = await Promise.all([
        Billing.aggregate([
          {
            $match: {
              deletedAt: null,
              createdAt: { $gte: m.start, $lte: m.end }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalAmount" }
            }
          }
       ] ),

        Payment.aggregate([
          {
            $match: {
              deletedAt: null,
              status: "ACTIVE",
              receivedAt: { $gte: m.start, $lte: m.end }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amountCents" }
            }
          }
        ])
      ]);

      trend.push({
        month: m.label,
        billed: billedAgg[0]?.total || 0,
        paid: paidAgg[0]?.total || 0
      });
    }
    

    // -----------------------------
    // RESPONSE
    // -----------------------------
    return apiResponse({
      res,
      data: {
        currentMonth: `${now.getFullYear()}-${now.getMonth() + 1}`,

        visits: {
          totalThisMonth: monthlyVisitsCount,
          recent: recentVisits
        },

        customers: {
          total: totalCustomers
        },

        billingVsPayments: {
          totalBilled,     // ✅ GLOBAL NOW
          totalPayments    // ✅ GLOBAL NOW
        },

        monthlySummary: {
          billed: monthlyBilled,
          paid: monthlyPaid
        },

        payments: {
          totalThisMonth: monthlyPaymentsCount,
          recent: recentPayments
        },

        billingVsPaymentsTrend: trend
      
  }});
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};

 module.exports = { getDashboard };


