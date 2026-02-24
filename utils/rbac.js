const rolesHierarchy = require('../config/rolesConfig');

const getRoleConfig = (role) => rolesHierarchy[role] || null;

const getRoleRank = (role) => {
  const config = getRoleConfig(role);
  return config ? config.rank : 0;
};

const hasPermission = (role, permission) => {
  const config = getRoleConfig(role);
  if (!config) return false;
  if (config.permissions.includes('all')) return true;
  return config.permissions.includes(permission);
};

const hasAnyPermission = (role, permissions) => permissions.some((permission) => hasPermission(role, permission));

module.exports = {
  getRoleConfig,
  getRoleRank,
  hasPermission,
  hasAnyPermission
};
