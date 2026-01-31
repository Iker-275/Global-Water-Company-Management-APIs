const Village = require("../models/villageModel");
const Zone = require("../models/zoneModel");
const Customer = require('../models/customerModel');

const {apiResponse} = require("../utils/apiResponse");
const { createNotification } = require("../services/notificationService");

/**
 * CREATE
 */

const createVillage = async (req, res) => {
  try {
    const { zoneId, code, name } = req.body;

    // 1️⃣ Validate zone
    const zone = await Zone.findOne({ _id: zoneId, deletedAt: null });
    if (!zone) {
      return apiResponse({
        res,
        success: false,
        message: "Invalid zone"
      });
    }

    // 2️⃣ Check duplicates (same zone)
    const duplicate = await Village.findOne({
      zoneId,
      deletedAt: null,
      $or: [
        { code },
        { name: new RegExp(`^${name}$`, "i") } // case-insensitive
      ]
    });

    if (duplicate) {
      let message = "Village already exists";

      if (duplicate.code === code) {
        message = `Village code "${code}" already exists in this zone`;
      } else if (duplicate.name.toLowerCase() === name.toLowerCase()) {
        message = `Village name "${name}" already exists in this zone`;
      }

      return apiResponse({
        res,
        success: false,
        message
      });
    }

    // 3️⃣ Create village
    const village = await Village.create({
      ...req.body,
      zoneCode: zone.code
    });

    // 4️⃣ Notify
    await createNotification({
      type: "VILLAGE_CREATED",
      message: `Village ${village.name} created`,
      targetRoles: ["admin", "system"]
    });

    return apiResponse({
      res,
      message: "Village created successfully",
      data: village
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

/**
 * GET ALL (pagination + filters)
 */
 const getVillages = async (req, res) => {
  const {
    page = 1,
    limit = 10,
    zoneId,
    search
  } = req.query;

  const filter = { deletedAt: null };

  if (zoneId) filter.zoneId = zoneId;
  if (search)
    filter.name = { $regex: search, $options: "i" };

  const skip = (page - 1) * limit;

  const [villages, total] = await Promise.all([
    Village.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Village.countDocuments(filter)
  ]);

  return apiResponse({
    res,
    data: villages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + villages.length < total
    }
  });
};

/**
 * GET BY ID
 */
 const getVillageById = async (req, res) => {
  const village = await Village.findOne({
    _id: req.params.id,
    deletedAt: null
  });

  if (!village)
    return apiResponse({ res, success: false, message: "Village not found" });

  return apiResponse({ res, data: village });
};

/**
 * UPDATE
 */
const updateVillage = async (req, res) => {
  try {
    const { zoneId, code, name } = req.body;
    const villageId = req.params.id;

    // 1️⃣ Fetch existing village
    const existingVillage = await Village.findOne({
      _id: villageId,
      deletedAt: null
    });

    if (!existingVillage) {
      return apiResponse({
        res,
        success: false,
        message: "Village not found"
      });
    }

    // 2️⃣ If zoneId is changing → validate zone
    let finalZoneId = existingVillage.zoneId;
    let finalZoneCode = existingVillage.zoneCode;

    if (zoneId && zoneId.toString() !== existingVillage.zoneId.toString()) {
      const zone = await Zone.findOne({ _id: zoneId, deletedAt: null });
      if (!zone) {
        return apiResponse({
          res,
          success: false,
          message: "Invalid zone"
        });
      }

      finalZoneId = zoneId;
      finalZoneCode = zone.code;
      req.body.zoneCode = zone.code;
    }

    // 3️⃣ Duplicate check (exclude current village)
    if (code || name || zoneId) {
      const duplicate = await Village.findOne({
        _id: { $ne: villageId },
        zoneId: finalZoneId,
        deletedAt: null,
        $or: [
          ...(code ? [{ code }] : []),
          ...(name
            ? [{ name: new RegExp(`^${name}$`, "i") }]
            : [])
        ]
      });

      if (duplicate) {
        let message = "Village already exists";

        if (code && duplicate.code === code) {
          message = `Village code "${code}" already exists in this zone`;
        } else if (
          name &&
          duplicate.name.toLowerCase() === name.toLowerCase()
        ) {
          message = `Village name "${name}" already exists in this zone`;
        }

        return apiResponse({
          res,
          success: false,
          message
        });
      }
    }

    // 4️⃣ Update
    const village = await Village.findOneAndUpdate(
      { _id: villageId, deletedAt: null },
      {
        ...req.body,
        zoneId: finalZoneId,
        zoneCode: finalZoneCode
      },
      { new: true }
    );

    // 5️⃣ Notify
    await createNotification({
      type: "VILLAGE_UPDATED",
      message: `Village ${village.name} updated`,
      targetRoles: ["admin"]
    });

    return apiResponse({
      res,
      message: "Village updated",
      data: village
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

/**
 * DELETE (soft)
 */

const deleteVillage = async (req, res) => {
  try {
    const villageId = req.params.id;

    // 1️⃣ Check if village has customers
    const hasCustomers = await Customer.exists({
      villageId,
      deletedAt: null
    });

    if (hasCustomers) {
      return apiResponse({
        res,
        success: false,
        message: "Village cannot be deleted. It has customers."
      });
    }

    // 2️⃣ Soft delete village
    const village = await Village.findOneAndUpdate(
      { _id: villageId, deletedAt: null },
      { deletedAt: new Date() }
    );

    if (!village) {
      return apiResponse({
        res,
        success: false,
        message: "Village not found"
      });
    }

    // 3️⃣ Notify
    await createNotification({
      type: "VILLAGE_DELETED",
      message: `Village ${village.name} deleted`,
      targetRoles: ["admin"]
    });

    return apiResponse({
      res,
      message: "Village deleted successfully"
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


module.exports = {  createVillage, getVillages, getVillageById, updateVillage, deleteVillage }; 