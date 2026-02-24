const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { getRoleRank, hasPermission, hasAnyPermission } = require('../utils/rbac');

// Login endpoint.
// Validates credentials and returns JWT + basic user data.
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email credentials' });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password credentials' });
    }

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

// Create user (signup).
// New users always start with "user" role from this endpoint.
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const role = 'user';

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
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

// Get all users without password field.
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get one user by id without password field.
exports.getUserById = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const isOwner = req.user.id === targetUserId;
    const canReadAnyProfile = hasAnyPermission(req.user.role, ['read_users', 'manage_users']);

    if (!isOwner && !canReadAnyProfile) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user profile with role hierarchy checks.
// This endpoint supports profile edits and controlled role assignment.
exports.updateUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const targetUserId = req.params.id;
    const isOwner = req.user.id === targetUserId;

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const myLevel = getRoleRank(req.user.role);
    const targetLevel = getRoleRank(targetUser.role);

    // You can update others only if your level is higher than target user.
    if (!isOwner && myLevel <= targetLevel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot modify profiles of users at your level or higher.'
      });
    }

    if (req.body.role) {
      if (!hasPermission(req.user.role, 'assign_roles')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to assign roles.'
        });
      }

      const newRoleLevel = getRoleRank(req.body.role);
      if (!newRoleLevel) {
        return res.status(400).json({ success: false, message: 'Invalid target role' });
      }

      // Users cannot change their own role.
      if (isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You cannot change your own role.'
        });
      }

      // You cannot assign a role equal to or above your own level (except root).
      if (myLevel <= newRoleLevel && !hasPermission(req.user.role, 'all')) {
        return res.status(403).json({
          success: false,
          message: `Access denied: You cannot assign '${req.body.role}' role beyond your authority level.`
        });
      }
    }

    // Password updates must go through the dedicated password endpoint.
    if (req.body.password) {
      delete req.body.password;
    }

    req.body.updatedBy = req.user._id;

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'User profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Change password for self or admin-level users.
exports.simplePasswordUpdate = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const targetUserId = req.params.id;

    const isOwner = req.user.id === targetUserId;
    const isAdmin = ['admin', 'superuser', 'root'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only change your own password unless you are admin-level.'
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user only if requester has higher authority than target user.
exports.deleteUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const myLevel = getRoleRank(req.user.role);
    const targetLevel = getRoleRank(targetUser.role);

    if (myLevel <= targetLevel && !hasPermission(req.user.role, 'all')) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You cannot delete a '${targetUser.role}' user beyond your authority level.`
      });
    }

    await User.findByIdAndDelete(targetUserId);
    res.status(200).json({ success: true, message: `User (${targetUser.role}) deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
