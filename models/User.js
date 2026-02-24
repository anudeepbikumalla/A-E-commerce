const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /.+\@.+\..+/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: [
      'user',      // Regular customer.
      'support',   // Support team member.
      'delivery',  // Delivery staff.
      'vendor',    // Third-party seller.
      'marketing', // Marketing team.
      'sales',     // Sales team.
      'manager',   // Operations manager.
      'editor',    // Content editor.
      'admin',     // Administrator.
      'superuser', // Senior administrator.
      'root'       // Highest privilege.
    ],
    default: 'user'
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Hash password before saving when it has changed.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

module.exports = mongoose.model('User', userSchema);
