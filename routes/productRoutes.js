const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const { validateCreateProductBody, validateUpdateProductBody } = require('../middleware/validateBody');

// Public product listing endpoints.
router.get('/', productController.getAllProducts);
router.get('/:id', validateObjectId('id'), productController.getProductById);

// Create product for roles with product creation/management permissions.
router.post('/', authMiddleware, validateCreateProductBody, checkPermission('manage_products', 'create_product'), productController.createProduct);

// Update and delete based on management or ownership permissions.
router.put('/:id', authMiddleware, validateObjectId('id'), validateUpdateProductBody, checkPermission('manage_products', 'manage_own_products'), productController.updateProduct);
router.delete('/:id', authMiddleware, validateObjectId('id'), checkPermission('manage_products', 'manage_own_products'), productController.deleteProduct);

module.exports = router;
