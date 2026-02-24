const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Connect to MongoDB without deprecated options.
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');
  } catch (err) {
    console.error(err);
    process.exit(1); // Exit process when database connection fails.
  }
};

module.exports = connectDB;
