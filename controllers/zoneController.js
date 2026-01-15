const Zone = require('../models/zoneModel');

const Village = require('../models/villageModel');
const Customer = require('../models/customerModel');
const { apiResponse } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');

 const createZone = async (req, res) => {
  try {
    const { code, name } = req.body;

    const exists = await Zone.findOne({
      $or: [{ code }, { name }],
      deletedAt: null
    });

    if (exists) {
      return apiResponse({
        res,
        success: false,
        message: "Zone with same code or name already exists"
      });
    }

    const zone = await Zone.create(req.body);

    await createNotification({
      type: "ZONE_CREATED",
      message: `Zone ${zone.name} created`,
      targetRoles: ["admin", "system"],
      relatedEntity: { entityType: "zone", entityId: zone._id }
    });

    return apiResponse({
      res,
      message: "Zone created successfully",
      data: zone
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};

 const getZones = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, search } = req.query;
    const skip = (page - 1) * limit;

    const query = { deletedAt: null };

    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } }
      ];
    }

    const [zones, total] = await Promise.all([
      Zone.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit)),
      Zone.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return apiResponse({
      res,
      data:  zones,
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

 const updateZone = async (req, res) => {
  try {
    if (req.body.code) {
      return apiResponse({
        res,
        success: false,
        message: "Zone code cannot be updated"
      });
    }

    const zone = await Zone.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true }
    );

    if (!zone) {
      return apiResponse({
        res,
        success: false,
        message: "Zone not found"
      });
    }

    await createNotification({
      type: "ZONE_UPDATED",
      message: `Zone ${zone.name} updated`,
      targetRoles: ["admin"]
    });

    return apiResponse({
      res,
      message: "Zone updated successfully",
      data: zone
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};

 const deleteZone = async (req, res) => {
  try {
    const zoneId = req.params.id;

    const hasVillages = await Village.exists({
      zoneId,
      deletedAt: null
    });

    const hasCustomers = await Customer.exists({
      zoneId,
      deletedAt: null
    });

    if (hasVillages || hasCustomers) {
      return apiResponse({
        res,
        success: false,
        message: "Zone cannot be deleted. It has villages or customers."
      });
    }

    const zone = await Zone.findOneAndUpdate(
      { _id: zoneId, deletedAt: null },
      { deletedAt: new Date() }
    );

    if (!zone) {
      return apiResponse({
        res,
        success: false,
        message: "Zone not found"
      });
    }

    await createNotification({
      type: "ZONE_DELETED",
      message: `Zone ${zone.name} deleted`,
      targetRoles: ["admin"]
    });

    return apiResponse({
      res,
      message: "Zone deleted successfully"
    });
  } catch (error) {
    return apiResponse({
      res,
      success: false,
      message: error.message
    });
  }
};


module.exports = {getZones,createZone,updateZone,deleteZone};