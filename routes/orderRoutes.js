const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

// Read orders based on role permissions.
router.get('/', authMiddleware, checkPermission('read_orders', 'read_assigned_orders', 'read_own_orders', 'place_orders', 'manage_orders'), orderController.getAllOrders);
router.get('/:id', authMiddleware, validateObjectId('id'), checkPermission('read_orders', 'read_own_orders', 'place_orders', 'manage_orders'), orderController.getOrderById);

// Place a new order.
router.post('/', authMiddleware, checkPermission('place_orders'), orderController.createOrder);

// Full update and status-only update are separated for better control.
router.put('/:id', authMiddleware, validateObjectId('id'), checkPermission('manage_orders'), orderController.updateOrder);
router.put('/:id/status', authMiddleware, validateObjectId('id'), checkPermission('update_order_status', 'manage_orders'), orderController.updateOrderStatus);

// Delete allowed by permission rules (manage orders or own order flow).
router.delete('/:id', authMiddleware, validateObjectId('id'), checkPermission('manage_orders', 'place_orders'), orderController.deleteOrder);

module.exports = router;
