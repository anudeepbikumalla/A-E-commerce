const { getRoleConfig, hasAnyPermission } = require('../utils/rbac');

// Permission middleware factory.
// Access is granted when user has at least one of the required permissions.
const checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const userRoleConfig = getRoleConfig(req.user.role);
    if (!userRoleConfig) {
      return res.status(403).json({ success: false, message: 'Invalid user role' });
    }

    if (hasAnyPermission(req.user.role, requiredPermissions)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied: You do not have permission to perform this action.'
    });
  };
};

module.exports = { checkPermission };
