
const Notification = require( "../models/notificationModel");
const  { apiResponse } = require ("../utils/apiResponse.js");
const User = require("../models/userModel");

const createNotificationController = async (req, res) => {
  try {
    const { targetRoles, targetUsers = [] } = req.body;

    let resolvedUsers = targetUsers;

    if (targetRoles?.length) {
      const users = await User.find({
        role: { $in: targetRoles },
        deletedAt: null
      }).select("_id");

      resolvedUsers = [
        ...new Set([...resolvedUsers, ...users.map(u => u._id.toString())])
      ];
    }

    const notification = await Notification.create({
      ...req.body,
      targetUsers: resolvedUsers
    });

    return apiResponse({
      res,
      message: "Notification created successfully",
      data: notification
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


const getNotifications2 = async (req, res) => {
  try {
    const {
      userId,
      unread,
      page = 1,
      limit = 10
    } = req.query;

    if (!userId) {
      return apiResponse({
        res,
        success: false,
        message: "userId is required"
      });
    }

    const filter = {
      deletedAt: null,
      targetUsers: userId
    };

    if (unread === "true") {
      filter.readBy = { $ne: userId };
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter)
    ]);

    return apiResponse({
      res,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + notifications.length < total
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

const getNotifications = async (req, res) => {
  try {
    const {
      userId,
      unread,
      page = 1,
      limit = 10
    } = req.query;

    if (!userId) {
      return apiResponse({
        res,
        success: false,
        message: "userId is required"
      });
    }

    const filter = {
      deletedAt: null,
      targetUsers: userId
    };

    if (unread === "true") {
      filter.readBy = { $ne: userId };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .select("-readBy -targetUsers") // 👈 hide fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Notification.countDocuments(filter)
    ]);

    return apiResponse({
      res,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + notifications.length < total
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

 const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      deletedAt: null
    });

    if (!notification) {
      return apiResponse({
        res,
        success: false,
        message: "Notification not found",
        statusCode: 404
      });
    }

    return apiResponse({
      res,
      message: "Notification fetched successfully",
      data: notification
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

const markAsRead = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return apiResponse({
        res,
        success: false,
        message: "userId is required"
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        deletedAt: null,
        targetUsers: userId
      },
      {
        $addToSet: { readBy: userId }
      },
      { new: true }
    );

    if (!notification) {
      return apiResponse({
        res,
        success: false,
        message: "Notification not found or access denied",
        statusCode: 404
      });
    }

    return apiResponse({
      res,
      message: "Notification marked as read",
      data: notification
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

const markAllAsRead = async (req, res) => {
  const { userId } = req.body;

  await Notification.updateMany(
    {
      targetUsers: userId,
      readBy: { $ne: userId },
      deletedAt: null
    },
    { $addToSet: { readBy: userId } }
  );

  return apiResponse({
    res,
    message: "All notifications marked as read"
  });
};


 const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return apiResponse({
        res,
        success: false,
        message: "Notification not found",
        statusCode: 404
      });
    }

    return apiResponse({
      res,
      message: "Notification deleted successfully"
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


module.exports = {createNotificationController,createNotificationController,getNotifications,getNotificationById,markAsRead,markAllAsRead,deleteNotification};