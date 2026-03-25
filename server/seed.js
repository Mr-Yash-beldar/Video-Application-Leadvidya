require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Meeting = require("./models/Meeting");

const seedDatabase = async () => {
  try {
    // Connect to the DB using the updated config
    await connectDB();

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Meeting.deleteMany({});

    console.log("Seeding Admin User...");
    const adminUser = await User.create({
      username: "admin",
      password: "admin123", // Storing in plain text as per original app logic fallback
      role: "admin",
    });

    console.log("Seeding Initial Test Meeting Room...");
    await Meeting.create({
      meetingId: "test-room-123",
      title: "LeadVidya Seeded Test Class",
      status: "waiting",
      hostId: adminUser._id,
    });

    console.log("Database Seeded Successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
