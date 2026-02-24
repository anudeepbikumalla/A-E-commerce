const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const fail = (res, message) => res.status(400).json({ success: false, message });

const validateLoginBody = (req, res, next) => {
  const { email, password } = req.body || {};
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return fail(res, 'Email and password are required.');
  }
  return next();
};

const validateForgotPasswordBody = (req, res, next) => {
  const { email } = req.body || {};
  if (!isNonEmptyString(email)) {
    return fail(res, 'Email is required.');
  }
  return next();
};

const validateResetPasswordBody = (req, res, next) => {
  const { token, newPassword } = req.body || {};
  if (!isNonEmptyString(token)) {
    return fail(res, 'Reset token is required.');
  }
  if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
    return fail(res, 'newPassword must be at least 6 characters.');
  }
  return next();
};

const validateCreateUserBody = (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (!isNonEmptyString(name)) return fail(res, 'Name is required.');
  if (!isNonEmptyString(email)) return fail(res, 'Email is required.');
  if (!isNonEmptyString(password) || password.length < 6) {
    return fail(res, 'Password must be at least 6 characters.');
  }
  return next();
};

const validateUpdateUserBody = (req, res, next) => {
  const allowed = ['name', 'email', 'phone', 'address', 'role', 'password'];
  const keys = Object.keys(req.body || {});
  if (keys.length === 0) return fail(res, 'At least one field is required for update.');
  const hasInvalid = keys.some((key) => !allowed.includes(key));
  if (hasInvalid) return fail(res, 'Request contains unsupported user update fields.');
  return next();
};

const validatePasswordUpdateBody = (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!isNonEmptyString(newPassword) || newPassword.length < 6) {
    return fail(res, 'newPassword must be at least 6 characters.');
  }

  if (req.user && req.params && req.user.id === req.params.id) {
    if (!isNonEmptyString(currentPassword)) {
      return fail(res, 'currentPassword is required when changing your own password.');
    }
  }

  return next();
};

const validateCreateProductBody = (req, res, next) => {
  const { name, price, category } = req.body || {};
  if (!isNonEmptyString(name)) return fail(res, 'Product name is required.');
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return fail(res, 'Product price must be a valid non-negative number.');
  }
  if (!isNonEmptyString(category)) return fail(res, 'Product category is required.');
  return next();
};

const validateUpdateProductBody = (req, res, next) => {
  const keys = Object.keys(req.body || {});
  if (keys.length === 0) return fail(res, 'At least one field is required for update.');
  if ('price' in req.body && (typeof req.body.price !== 'number' || Number.isNaN(req.body.price) || req.body.price < 0)) {
    return fail(res, 'Product price must be a valid non-negative number.');
  }
  if ('stock' in req.body && (!Number.isInteger(req.body.stock) || req.body.stock < 0)) {
    return fail(res, 'Product stock must be a valid non-negative integer.');
  }
  return next();
};

const validateCreateOrderBody = (req, res, next) => {
  const { products, shippingAddress } = req.body || {};
  if (!Array.isArray(products) || products.length === 0) {
    return fail(res, 'Order must contain at least one product.');
  }
  if (!isNonEmptyString(shippingAddress)) {
    return fail(res, 'Shipping address is required.');
  }

  for (const item of products) {
    if (!item || !item.product) {
      return fail(res, 'Each order item must include a product id.');
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return fail(res, 'Each order item must include a valid quantity.');
    }
  }

  return next();
};

const validateOrderStatusBody = (req, res, next) => {
  const { status } = req.body || {};
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return fail(res, 'Invalid status value.');
  }
  return next();
};

module.exports = {
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateCreateUserBody,
  validateUpdateUserBody,
  validatePasswordUpdateBody,
  validateCreateProductBody,
  validateUpdateProductBody,
  validateCreateOrderBody,
  validateOrderStatusBody
};
