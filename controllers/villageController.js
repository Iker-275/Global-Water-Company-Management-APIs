const Village = require("../models/villageModel");
const Zone = require("../models/zoneModel");
const {apiResponse} = require("../utils/apiResponse");
const { createNotification } = require("../services/notificationService");

/**
 * CREATE
 */
 const createVillage = async (req, res) => {
  const { zoneId } = req.body;

  const zone = await Zone.findOne({ _id: zoneId, deletedAt: null });
  if (!zone)
    return apiResponse({ res, success: false, message: "Invalid zone" });

  const village = await Village.create({
    ...req.body,
    zoneCode: zone.code
  });

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
  if (req.body.zoneId) {
    const zone = await Zone.findOne({
      _id: req.body.zoneId,
      deletedAt: null
    });
    if (!zone)
      return apiResponse({ res, success: false, message: "Invalid zone" });

    req.body.zoneCode = zone.code;
  }

  const village = await Village.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    req.body,
    { new: true }
  );

  if (!village)
    return apiResponse({ res, success: false, message: "Village not found" });

  await createNotification({
    type: "VILLAGE_UPDATED",
    message: `Village ${village.name} updated`,
    targetRoles: ["admin"]
  });

  return apiResponse({ res, message: "Village updated", data: village });
};

/**
 * DELETE (soft)
 */
 const deleteVillage = async (req, res) => {
  const village = await Village.findOneAndUpdate(
    { _id: req.params.id, deletedAt: null },
    { deletedAt: new Date() }
  );

  if (!village)
    return apiResponse({ res, success: false, message: "Village not found" });

  await createNotification({
    type: "VILLAGE_DELETED",
    message: `Village ${village.name} deleted`,
    targetRoles: ["admin"]
  });

  return apiResponse({ res, message: "Village deleted" });
};


module.exports = {  createVillage, getVillages, getVillageById, updateVillage, deleteVillage }; 