// middleware/roleMiddleware.js

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Not authenticated" });

    if (!roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: "Forbidden: insufficient rights" });

    next();
  };
};

module.exports = {allowRoles};