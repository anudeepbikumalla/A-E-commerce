const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { checkAccess } = require("../middleware/permissionMiddleware");

// --- PUBLIC ROUTES ---

// Signup Route (Create User)
router.post("/", userController.createUser);

// Login Route (Now linked to your controller)
router.post("/login", userController.loginUser);

// this is for finding password
router.post("/findpassword", userController.findpassword);


// --- PROTECTED ROUTES (Requires Login) ---

// Get User by ID (User must be logged in)
router.get("/:id", authMiddleware, userController.getUserById);

// Update User (User must be logged in)
router.put("/:id", authMiddleware, userController.updateUser);

// Note the :id at the end so we know WHICH user to update
router.post("/update-password/:id", authMiddleware, userController.simplePasswordUpdate);

// // Simple route for the logged-in user to reset their own password
// router.post("/update-password-simple", authMiddleware, userController.simplePasswordUpdate);


// --- ADMIN ONLY ROUTES ---


// Get all users (Admin only)
router.get("/",
  authMiddleware,
  checkAccess("users", "get"),
  userController.getAllUsers
);

// Delete user (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  checkAccess("users", "delete"),
  userController.deleteUser
);

module.exports = router;



// const express = require("express");
// const router = express.Router();
// const userController = require("../controllers/userController");
// const authMiddleware = require("../middleware/authMiddleware");
// const { allowRoles } = require("../middleware/roleMiddleware");

// // Admin only
// router.get(
//   "/",
//   authMiddleware,
//   allowRoles("admin"),
//   userController.getAllUsers
// );

// // Admin only
// router.delete(
//   "/:id",
//   authMiddleware,
//   allowRoles("admin"),
//   userController.deleteUser
// );


// router.get('/login', (req, res) => {
//     res.json({message: 'this is login route'});
// });


// // Public (signup)
// router.post("/", userController.createUser);

// module.exports = router;

// router.put('/:id', userController.updateUser);
// const express = require('express');
// const router = express.Router();
// const userController = require('../controllers/userController');

// // Get all users
// router.get('/', userController.getAllUsers);

// // Get user by ID
// router.get('/:id', userController.getUserById);

// // Create new user
// router.post('/', userController.createUser);

// Update user


// // Delete user
// router.delete('/:id', userController.deleteUser);

// module.exports = router;
