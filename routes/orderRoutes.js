const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkAccess } = require('../middleware/permissionMiddleware');

// Get all orders
router.get(
  '/',
  authMiddleware,
  checkAccess('orders', 'get'),
  orderController.getAllOrders
);

// Get order by ID
router.get(
  '/:id',
  authMiddleware,
  checkAccess('orders', 'get'),
  orderController.getOrderById
);

// Create new order
router.post(
  '/',
  authMiddleware,
  checkAccess('orders', 'post'),
  orderController.createOrder
);

// Update order
router.put(
  '/:id',
  authMiddleware,
  checkAccess('orders', 'put'),
  orderController.updateOrder
);

// Delete order
router.delete(
  '/:id',
  authMiddleware,
  checkAccess('orders', 'delete'),
  orderController.deleteOrder
);

module.exports = router;
