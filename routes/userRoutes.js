const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware"); 

// --- PUBLIC ROUTES ---

// Signup Route (Create User)
router.post("/", userController.createUser);

// Login Route
router.post("/login", userController.loginUser);


// Find Password Route   // only for ttesting, remove in production
router.post("/findpassword", userController.findpassword);


// --- PROTECTED ROUTES (Requires Login) ---

// Get User by ID (User must be logged in)
router.get("/:id", authMiddleware, userController.getUserById);

// Update User (User must be logged in)
router.put("/:id", authMiddleware, userController.updateUser);

// Change Password (User must be logged in)
router.post("/update-password/:id", authMiddleware, userController.simplePasswordUpdate);


// --- ADMIN ONLY ROUTES ---

// Get all users (Only Admin can see everyone)
router.get("/",
  authMiddleware,
  allowRoles("admin"), 
  userController.getAllUsers
);

// Delete user (Only Admin can delete)
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("admin", "root"), 
  userController.deleteUser
);

module.exports = router;
