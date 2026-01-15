const { apiResponse } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');
const Rate = require('../models/ratesModel');

const createRate = async (req, res) => {
  await Rate.updateMany(
    { effectiveTo: null, deletedAt: null },
    { effectiveTo: new Date() }
  );

  
  const rate = await Rate.create({
    ...req.body,
    effectiveFrom: new Date()
  });

  await createNotification({
    type: "RATE_CREATED",
    message: "New rate applied",
    targetRoles: ["admin", "system"]
  });

  return apiResponse({ res, message: "Rate created", data: rate });
};


 const getCurrentRate = async (req, res) => {
  try {
    const rate = await Rate.findOne({
      effectiveTo: null,
      deletedAt: null
    }).sort({ effectiveFrom: -1 });

    if (!rate) {
      return apiResponse({
        res,
        success: false,
        message: "No active rate found",
        statusCode: 404
      });
    }

    return apiResponse({
      res,
      message: "Current rate fetched successfully",
      data: rate
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};

 const getSingleRate = async (req, res) => {
  try {
    const rate = await Rate.findOne({
      _id: req.params.id,
      deletedAt: null
    });

    if (!rate) {
      return apiResponse({
        res,
        success: false,
        message: "Rate not found",
        statusCode: 404
      });
    }

    return apiResponse({
      res,
      message: "Rate fetched successfully",
      data: rate
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};

 const getAllRates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      active,
      fromDate,
      toDate
    } = req.query;

    const skip = (page - 1) * limit;

    const query = { deletedAt: null };

    // Active / inactive
    if (active === "true") query.effectiveTo = null;
    if (active === "false") query.effectiveTo = { $ne: null };

    // Date filters
    if (fromDate || toDate) {
      query.effectiveFrom = {};
      if (fromDate) query.effectiveFrom.$gte = new Date(fromDate);
      if (toDate) query.effectiveFrom.$lte = new Date(toDate);
    }

    const [rates, total] = await Promise.all([
      Rate.find(query)
        .sort({ effectiveFrom: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      Rate.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return apiResponse({
      res,
      message: "Rates fetched successfully",
      data: rates,
      
      pagination: { 
         total,
          page: Number(page),
          limit: Number(limit),
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
      }
      
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};



 const deleteRate = async (req, res) => {
  try {
    const rate = await Rate.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!rate) {
      return apiResponse({
        res,
        success: false,
        message: "Rate not found",
        statusCode: 404
      });
    }

    await createNotification({
      type: "RATE_DELETED",
      message: "Rate deleted",
      targetRoles: ["admin"]
    });

    return apiResponse({
      res,
      message: "Rate deleted successfully"
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};

 const updateRate = async (req, res) => {
  return apiResponse({
    res,
    success: false,
    message: "Rates cannot be updated. Create a new rate instead.",
    statusCode: 403
  });
};

module.exports = {
  createRate,
  getCurrentRate,
  updateRate,deleteRate,getAllRates,getSingleRate
};