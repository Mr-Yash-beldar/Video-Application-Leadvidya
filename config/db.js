const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb+srv://yspinfotech:Ydbaba@yspinfotech.canzyol.mongodb.net/zoom-clone");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
