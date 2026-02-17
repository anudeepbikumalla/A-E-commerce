const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB connection without deprecated options
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected...");
  } catch (err) {
    console.error(err);
    process.exit(1); // Exit if connection fails
  }
};

module.exports = connectDB;



// const mongoose = require('mongoose');
// require('dotenv').config();

// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
//     console.log("MongoDB connected..."); // Ye message terminal mein aayega agar connection successful ho
//   } catch (err) {
//     console.error(err);
//     process.exit(1); // Agar connection mein koi error aata hai toh server ko shutdown kar dega
//   }
// };

// module.exports = connectDB;
