const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ["admin", "guest"], default: "guest" },
  status: { type: String, enum: ["in_waiting_room", "admitted", "kicked"], default: "in_waiting_room" }
});

const meetingSchema = new mongoose.Schema(
  {
    meetingId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    title: { 
      type: String, 
      default: "LeadVidya Class" 
    },
    status: { 
      type: String, 
      enum: ["waiting", "active", "ended"], 
      default: "waiting" 
    },
    hostId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    participants: [participantSchema],
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);
