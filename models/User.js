const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String, // Ideally hashed with bcrypt
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "guest"],
      default: "admin",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
