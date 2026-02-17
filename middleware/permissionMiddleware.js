const accessConfig = require("../config/accessConfig");

const checkAccess = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    if (req.user.role === "root") {
      return next();
    }

    const allowedRoles =
      accessConfig?.[resource]?.[action] || [];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    next();
  };
};

module.exports = { checkAccess };
