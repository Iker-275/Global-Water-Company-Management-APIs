const Expense = require("../models/expenseModel");

// ===============================
// CREATE EXPENSE
// ===============================
const createExpense = async (req, res) => {
  try {
    const { name, description, amount, expenseDate } = req.body;

    const date = expenseDate ? new Date(expenseDate) : new Date();

    const expense = await Expense.create({
      name,
      description,
      amount,
      expenseDate: date,
      day: date.getDate(),
      monthOfYear: date.getMonth() + 1,
      year: date.getFullYear(),
      weekOfYear: getWeekNumber(date),
      createdBy: req.user?.id || null
    });

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// UPDATE EXPENSE
// ===============================
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Expense.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    let updateData = { ...req.body };

    if (req.body.expenseDate) {
      const date = new Date(req.body.expenseDate);
      updateData.day = date.getDate();
      updateData.monthOfYear = date.getMonth() + 1;
      updateData.year = date.getFullYear();
      updateData.weekOfYear = getWeekNumber(date);
    }

    const updated = await Expense.findByIdAndUpdate(id, updateData, {
      new: true
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// DELETE EXPENSE
// ===============================
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Expense.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    res.json({ success: true, message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// GET SINGLE EXPENSE
// ===============================
const getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }

    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===============================
// GET EXPENSES WITH FILTERS + TOTAL
// ===============================
// const getExpenses = async (req, res) => {
//   try {
//     const {
//       name,
//       minAmount,
//       maxAmount,
//       year,
//       monthOfYear,
//       weekOfYear,
//       date
//     } = req.query;

//     let filter = {};

//     if (name) {
//       filter.name = { $regex: name, $options: "i" };
//     }

//     if (minAmount || maxAmount) {
//       filter.amount = {};
//       if (minAmount) filter.amount.$gte = Number(minAmount);
//       if (maxAmount) filter.amount.$lte = Number(maxAmount);
//     }

//     if (year) filter.year = Number(year);
//     if (monthOfYear) filter.monthOfYear = Number(monthOfYear);
//     if (weekOfYear) filter.weekOfYear = Number(weekOfYear);

//     if (date) {
//       const d = new Date(date);
//       filter.day = d.getDate();
//       filter.monthOfYear = d.getMonth() + 1;
//       filter.year = d.getFullYear();
//     }

//     const expenses = await Expense.find(filter).sort({ expenseDate: -1 });

//     // 🔥 ALWAYS recalculate total
//     const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

//     res.json({
//       success: true,
//       count: expenses.length,
//       totalAmount,
//       data: expenses
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const getExpenses = async (req, res) => {
  try {
    const {
      name,
      minAmount,
      maxAmount,
      year,
      monthOfYear,
      weekOfYear,
      date,
      page = 1,
      limit = 20
    } = req.query;

    let filter = {};

    // --------------------
    // FILTERS
    // --------------------
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    if (year) filter.year = Number(year);
    if (monthOfYear) filter.monthOfYear = Number(monthOfYear);
    if (weekOfYear) filter.weekOfYear = Number(weekOfYear);

    if (date) {
      const d = new Date(date);
      filter.day = d.getDate();
      filter.monthOfYear = d.getMonth() + 1;
      filter.year = d.getFullYear();
    }

    // --------------------
    // PAGINATION SETUP
    // --------------------
    const currentPage = Number(page);
    const pageLimit = Number(limit);
    const skip = (currentPage - 1) * pageLimit;

    // --------------------
    // TOTAL COUNT
    // --------------------
    const totalItems = await Expense.countDocuments(filter);

    // --------------------
    // FETCH PAGINATED DATA
    // --------------------
    const expenses = await Expense.find(filter)
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(pageLimit);

    // --------------------
    // 🔥 ALWAYS RECALCULATE TOTAL AMOUNT (FILTERED SET)
    // --------------------
    const allMatchingExpenses = await Expense.find(filter);
    const totalAmount = allMatchingExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );

    const totalPages = Math.ceil(totalItems / pageLimit);
    const hasNextPage = currentPage < totalPages;

    res.json({
      success: true,
      
        page: currentPage,
        limit: pageLimit,
        totalItems,
        totalPages,
        hasNextPage,
      
      totalAmount,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ===============================
// HELPERS
// ===============================
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports ={createExpense,updateExpense,deleteExpense,getExpense,getExpenses};