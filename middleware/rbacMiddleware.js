const UserRole = require("../models/UserRole");

exports.checkRole = (...allowedRoles) => {
  return async (req, res, next) => {
    const userRoles = await UserRole.find({ user: req.user._id })
      .populate("role");

    const roleNames = userRoles.map(r => r.role.name);

    const hasAccess = allowedRoles.some(role =>
      roleNames.includes(role)
    );

    if (!hasAccess) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    next();
  };
};
