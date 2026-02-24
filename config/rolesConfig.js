// Central role configuration.
// rank: higher value means higher authority.
// permissions: actions allowed for each role.
const rolesHierarchy = {
  root:      { rank: 11, permissions: ['all'] },
  
  superuser: { rank: 10, permissions: ['manage_users', 'manage_products', 'manage_orders', 'assign_roles'] },
  
  admin:     { rank: 9,  permissions: ['manage_users', 'manage_products', 'manage_orders', 'assign_roles'] },
  
  manager:   { rank: 8,  permissions: ['manage_products', 'manage_orders', 'assign_roles'] },
  
  editor:    { rank: 7,  permissions: ['update_content', 'read_products'] },
  
  sales:     { rank: 6,  permissions: ['read_orders', 'read_revenue'] },
  
  marketing: { rank: 5,  permissions: ['update_seo', 'read_products'] },
  
  vendor:    { rank: 4,  permissions: ['create_product', 'manage_own_products', 'read_own_orders'] },
  
  delivery:  { rank: 3,  permissions: ['update_order_status', 'read_assigned_orders'] },
  
  support:   { rank: 2,  permissions: ['read_orders', 'read_users'] },
  
  user:      { rank: 1,  permissions: ['manage_own_profile', 'place_orders', 'read_products'] }
};

module.exports = rolesHierarchy;
