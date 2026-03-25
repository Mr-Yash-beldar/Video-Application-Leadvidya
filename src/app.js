require('dotenv').config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const connectDB = require("../config/db");
const authMiddleware = require("./middleware/auth");
const Meeting = require("../models/Meeting");
const User = require("../models/User");

const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
// Need to refactor stream handler to use Mongo instead of Map
const streamHandler = require("./ws/stream");

connectDB();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "leadvidya_dev_secret_change_me";
const ADMIN_ID = process.env.ADMIN_ID || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const createMeetingId = () => {
  const first = Math.random().toString(36).slice(2, 6);
  const second = Math.random().toString(36).slice(2, 6);
  return `${first}-${second}`;
};

const signAdminToken = () => {
  return jwt.sign({ role: "admin", adminId: ADMIN_ID }, JWT_SECRET, {
    expiresIn: "8h",
  });
};

const verifyAdminToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

app.use(cors({ origin: true, credentials: true, optionsSuccessStatus: 200 }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, product: "LeadVidya Class API v2", db: "connected" });
});

app.post("/api/auth/admin/login", async (req, res) => {
  const { adminId, password } = req.body || {};

  if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
    const token = signAdminToken();
    return res.json({ token, adminId: ADMIN_ID });
  }

  const user = await User.findOne({ username: adminId, password });
  if (user) {
    const token = jwt.sign({ role: user.role, userId: user._id }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token, adminId: user.username });
  }

  return res.status(401).json({ message: "Invalid admin credentials" });
});

app.post("/api/meetings", authMiddleware, async (req, res) => {
  try {
    const title = (req.body && req.body.title ? String(req.body.title) : "LeadVidya Class").trim();
    const meetingId = createMeetingId();

    const meeting = await Meeting.create({
      meetingId,
      title,
      status: "waiting"
    });

    return res.status(201).json({
      meeting: { id: meeting.meetingId, title: meeting.title, started: false }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/api/meetings/:meetingId/start", authMiddleware, async (req, res) => {
  try {
    const { meetingId } = req.params;
    let meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    if (meeting.status !== "active") {
      meeting.status = "active";
      meeting.startedAt = new Date();
      await meeting.save();
    }

    return res.json({
      meeting: { id: meeting.meetingId, title: meeting.title, started: true }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/meetings/:meetingId/public", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    return res.json({
      meeting: {
        id: meeting.meetingId,
        title: meeting.title,
        started: meeting.status === "active"
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

const { AccessToken } = require('livekit-server-sdk');

app.post("/api/livekit/token", authMiddleware, async (req, res) => {
  try {
    const { roomName, identity } = req.body;

    // Safety Fallback: verify user is actually in DB for this room as admitted
    const meeting = await Meeting.findOne({ meetingId: roomName });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    // Validate they are admitted
    const isAdmitted = meeting.participants.find(p => p.name === identity && (p.status === "admitted" || p.role === "admin"));
    if (!isAdmitted && req.admin.role !== "admin") {
      return res.status(403).json({ message: "Not permitted to join room media yet." });
    }

    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY || "dev_key",
      process.env.LIVEKIT_API_SECRET || "dev_secret",
      { identity: identity, ttl: '2h' }
    );

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: req.admin.role === "admin"
    });

    return res.json({
      token: at.toJwt(),
      url: process.env.LIVEKIT_URL || "wss://your-livekit-server.livekit.cloud"
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate LiveKit token", error: err.message });
  }
});

const path = require("path");
app.use(express.static(path.join(__dirname, "../public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

io.of("/stream").on(
  "connection",
  streamHandler({ Meeting, verifyAdminToken })
);

server.listen(PORT, () => {
  console.log(`LeadVidya server running on port ${PORT}`);
});
