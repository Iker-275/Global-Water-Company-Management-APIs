
// const Notification = require("../models/notificationModel");

//  const createNotification = async ({
//   type,
//   message,
//   targetRoles = [],
//   targetUsers = [],
//   relatedEntity = null
// }) => {
//   return await Notification.create({
//     type,
//     message,
//     targetRoles,
//     targetUsers,
//     relatedEntity
//   });
// };

// module.exports= {createNotification};


const Notification = require("../models/notificationModel");
const User = require("../models/userModel");

const createNotification = async ({
  type,
  message,
  targetRoles = [],
  targetUsers = [],
  relatedEntity = null
}) => {
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

  return await Notification.create({
    type,
    message,
    targetRoles,
    targetUsers: resolvedUsers,
    relatedEntity
  });
};

module.exports = { createNotification };