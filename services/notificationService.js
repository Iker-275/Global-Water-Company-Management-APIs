
const Notification = require("../models/notificationModel");

 const createNotification = async ({
  type,
  message,
  targetRoles = [],
  targetUsers = [],
  relatedEntity = null
}) => {
  return await Notification.create({
    type,
    message,
    targetRoles,
    targetUsers,
    relatedEntity
  });
};

module.exports= {createNotification};