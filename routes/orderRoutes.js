const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

// Admin sees all, User sees their own (handled in controller)
router.get('/', authMiddleware, allowRoles('admin', 'manager', 'user'), orderController.getAllOrders);
router.get('/:id', authMiddleware, allowRoles('admin', 'manager', 'user'), orderController.getOrderById);

// Anyone logged in can create an order
router.post('/', authMiddleware, allowRoles('user', 'admin', 'manager'), orderController.createOrder);

// Only Admin/Manager can update status (e.g. "Shipped")
router.put('/:id', authMiddleware, allowRoles('admin', 'manager'), orderController.updateOrder);

// Admin can delete, User can maybe cancel (delete) pending orders?
router.delete('/:id', authMiddleware, allowRoles('admin', 'user'), orderController.deleteOrder);

module.exports = router;


