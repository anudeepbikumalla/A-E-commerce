const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');

// 1. LOGIN USER
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Early validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email Credentials" });
    }

    // Compare Password
    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid pass Credentials" });
    }

    // Create Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.findpassword = async (req, res) => {
  try {
    const { email } = req.body;   
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email Credentials" });
    }   

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,    
        password: user.password
      }
    });
  }   
  catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 2. CREATE NEW USER (Signup)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = 'user';
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }

    const user = new User({ name, email, password, role });
    const savedUser = await user.save();
    
    res.status(201).json({
      success: true,
      data: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role
      },
      message: 'User created successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 3. GET ALL USERS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. GET USER BY ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. UPDATE USER
exports.updateUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    const isOwner = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'root';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Security: Don't allow password update here
    if (req.body.password) {
      delete req.body.password;
    }

    if (req.body.role && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can change roles' });
    }

    req.body.updatedBy = req.user._id;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


exports.simplePasswordUpdate = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const targetUserId = req.params.id; // The ID from the URL /:id

    // Check: Is the person logged in the Owner OR an Admin?
    const isOwner = req.user.id === targetUserId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'root';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: You can only change your own password (unless you are an Admin)" 
      });
    }

    // Find the actual user being targeted
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = newPassword;
    await user.save(); // Triggers hashing hook

    res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};




// // updatec password
// exports.simplePasswordUpdate = async (req, res) => {
//   try {
//     const { newPassword } = req.body;
    
//     // 1. Find the user
//     const user = await User.findById(req.user.id);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }
//     // 2. Simply assign the new password
//     // This triggers the .pre('save') hook in your Model to hash it automatically!
//     user.password = newPassword;
//     await user.save();

//     res.status(200).json({ success: true, message: "Password updated successfully!" });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


// 6. DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};









// const User = require('../models/User');
// const bcryptjs = require('bcryptjs');

// // Get all users
// exports.getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find().select('-password');
//     res.status(200).json({
//       success: true,
//       data: users
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };


// // Get user by ID
// exports.getUserById = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).select('-password');
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }
//     res.status(200).json({
//       success: true,
//       data: user
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // Create new user
// exports.createUser = async (req, res) => {
//   try {
//     const user = new User(req.body);
//     const savedUser = await user.save();
//     res.status(201).json({
//       success: true,
//       data: {
//         id: savedUser._id,
//         name: savedUser.name,
//         email: savedUser.email,
//         role: savedUser.role
//       },
//       message: 'User created successfully'
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message

//     });
//   }
// };


// const User = require('../models/User');
// const jwt = require('jsonwebtoken');
// const bcryptjs = require('bcryptjs');

// exports.loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // 1. Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ success: false, message: "Invalid Credentials" });
//     }

//     // 2. Compare Password
//     const isMatch = await bcryptjs.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ success: false, message: "Invalid Credentials" });
//     }

//     // 3. Create Token
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN }
//     );

//     res.status(200).json({
//       success: true,
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         role: user.role
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Update user
// exports.updateUser = async (req, res) => {
//   try {
//     // Don't allow password update through this endpoint
//     if (req.body.password) {
//       delete req.body.password;
//     }
    
//     const user = await User.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true, runValidators: true }
//     ).select('-password');
    
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }
//     res.status(200).json({
//       success: true,
//       data: user,
//       message: 'User updated successfully'
//     });
//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       message: error.message
//     });
//   }
// };

// // Delete user
// exports.deleteUser = async (req, res) => {
//   try {
//     const user = await User.findByIdAndDelete(req.params.id);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }
//     res.status(200).json({
//       success: true,
//       message: 'User deleted successfully'
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message
//     });
//   }
// };
