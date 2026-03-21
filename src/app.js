const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const streamHandler = require("./ws/stream");

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "leadvidya_dev_secret_change_me";
const ADMIN_ID = process.env.ADMIN_ID || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const meetings = new Map();

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

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const payload = verifyAdminToken(token);

  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized admin access" });
  }

  req.admin = payload;
  return next();
};

app.use(cors({ origin: true, credentials: true, optionsSuccessStatus: 200 }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, product: "LeadVidya Class API" });
});

app.post("/api/auth/admin/login", (req, res) => {
  const { adminId, password } = req.body || {};

  if (adminId !== ADMIN_ID || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  const token = signAdminToken();
  return res.json({ token, adminId: ADMIN_ID });
});

app.post("/api/meetings", authMiddleware, (req, res) => {
  const title = (
    req.body && req.body.title ? String(req.body.title) : "LeadVidya Class"
  ).trim();
  const id = createMeetingId();

  meetings.set(id, {
    id,
    title,
    createdAt: new Date().toISOString(),
    startedAt: null,
    started: false,
  });

  return res.status(201).json({
    meeting: {
      id,
      title,
      started: false,
    },
  });
});

app.post("/api/meetings/:meetingId/start", authMiddleware, (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings.get(meetingId);

  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  if (!meeting.started) {
    meeting.started = true;
    meeting.startedAt = new Date().toISOString();
  }

  return res.json({
    meeting: { id: meeting.id, title: meeting.title, started: meeting.started },
  });
});

app.get("/api/meetings/:meetingId/public", (req, res) => {
  const { meetingId } = req.params;
  const meeting = meetings.get(meetingId);

  if (!meeting) {
    return res.status(404).json({ message: "Meeting not found" });
  }

  return res.json({
    meeting: {
      id: meeting.id,
      title: meeting.title,
      started: meeting.started,
    },
  });
});

io.of("/stream").on(
  "connection",
  streamHandler({ meetings, verifyAdminToken }),
);

server.listen(PORT, () => {
  console.log(`LeadVidya server running on port ${PORT}`);
});
