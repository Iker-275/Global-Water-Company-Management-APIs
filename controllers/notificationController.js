
const Notification = require( "../models/notificationModel");
const  { apiResponse } = require ("../utils/apiResponse.js");


 const createNotificationController = async (req, res) => {
  try {
    const notification = await Notification.create(req.body);

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


 const getNotifications = async (req, res) => {
  try {
    const { role, userId, unread } = req.query;

    const query = { deletedAt: null };

    if (role) query.targetRoles = role;
    if (userId) query.targetUsers = userId;
    if (unread === "true") query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 });

    return apiResponse({
      res,
      message: "Notifications fetched successfully",
      data: notifications
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
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { isRead: true },
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


module.exports = {createNotificationController,createNotificationController,getNotifications,getNotificationById,markAsRead,deleteNotification};