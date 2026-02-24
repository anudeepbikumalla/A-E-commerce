const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware"); 
const validateObjectId = require('../middleware/validateObjectId');
const { validateLoginBody, validateCreateUserBody, validateUpdateUserBody, validatePasswordUpdateBody } = require('../middleware/validateBody');

// Public auth routes.
router.post("/", validateCreateUserBody, userController.createUser);
router.post("/login", validateLoginBody, userController.loginUser);

// Profile routes (authenticated + permission checked).
router.get("/:id", authMiddleware, validateObjectId('id'), checkPermission('manage_own_profile', 'manage_users', 'read_users'), userController.getUserById);
router.put("/:id", authMiddleware, validateObjectId('id'), validateUpdateUserBody, checkPermission('manage_own_profile', 'manage_users', 'assign_roles'), userController.updateUser);
router.post("/update-password/:id", authMiddleware, validateObjectId('id'), validatePasswordUpdateBody, checkPermission('manage_own_profile', 'manage_users'), userController.simplePasswordUpdate);

// User management routes for operational/admin roles.
router.get("/", authMiddleware, checkPermission('manage_users', 'read_users'), userController.getAllUsers);
router.delete("/:id", authMiddleware, validateObjectId('id'), checkPermission('manage_users'), userController.deleteUser);

module.exports = router;
