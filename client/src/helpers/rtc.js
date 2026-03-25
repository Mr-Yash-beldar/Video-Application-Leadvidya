import h from "./index.js";
import io from "socket.io-client";
import { getAdminToken } from "../services/room";

const url =
  process.env.NODE_ENV === "production"
    ? "https://video-application-leadvidya.onrender.com"
    : "http://localhost:5000";

let pc = {};
// Connect but do NOT auto-subscribe — subscription is triggered explicitly
let socket = io(`${url}/stream`, { autoConnect: true });

var myStream = null;
var screen = null;
var recordedStream = [];
var mediaRecorder = "";

let rtcCallbacks = {
  onWaitingRoom: null,
  onUpdateParticipants: null,
  onJoinAccepted: null,
};

let listenersInitialized = false;
let currentMeetingId = "";

// ─── Audio Visualizer ────────────────────────────────────────────────────────

let audioContext = null;
const activeVisualizers = new Set();

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export function setupAudioVisualizer(stream, containerId) {
  if (!stream || !stream.getAudioTracks().length) return;
  if (activeVisualizers.has(containerId)) return; // prevent duplicates
  activeVisualizers.add(containerId);

  try {
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const THRESHOLD = 15;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const el = document.getElementById(containerId);
      if (el) {
        el.classList.toggle("is-speaking", avg > THRESHOLD);
        requestAnimationFrame(tick);
      } else {
        // Element removed, clean up
        activeVisualizers.delete(containerId);
        source.disconnect();
      }
    };
    tick();
  } catch (e) {
    console.warn("Audio visualizer error:", e);
    activeVisualizers.delete(containerId);
  }
}

// ─── Socket Listeners (attached once) ────────────────────────────────────────

const initSocketListeners = (meetingId) => {
  if (listenersInitialized) return;
  listenersInitialized = true;
  currentMeetingId = meetingId;

  // Server uses socket.id as authoritative ID — we just log it
  socket.on("connect", () => {
    console.log("Socket connected, id:", socket.id);
  });

  socket.on("waiting-room", () => {
    console.log("In waiting room");
    if (rtcCallbacks.onWaitingRoom) rtcCallbacks.onWaitingRoom(true);
  });

  socket.on("join-accepted", () => {
    console.log("Host admitted us!");
    if (rtcCallbacks.onWaitingRoom) rtcCallbacks.onWaitingRoom(false);
    if (rtcCallbacks.onJoinAccepted) rtcCallbacks.onJoinAccepted();
    // Re-subscribe as accepted participant so server joins us to the room
    sendSubscribe(currentMeetingId, true);
  });

  socket.on("update-participants", (data) => {
    if (rtcCallbacks.onUpdateParticipants) rtcCallbacks.onUpdateParticipants(data);
  });

  socket.on("meeting-error", (data) => {
    const msg = data && data.message ? data.message : "Unable to join this meeting.";
    window.alert(msg);
    window.location.href = "/";
  });

  socket.on("new user", (data) => {
    socket.emit("newUserStart", { to: data.socketId, sender: socket.id });
    init(true, data.socketId);
  });

  socket.on("newUserStart", (data) => {
    init(false, data.sender);
  });

  socket.on("ice candidates", async (data) => {
    if (!pc[data.sender]) return;
    try {
      if (data.candidate) {
        await pc[data.sender].addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (e) {
      console.error("ICE error:", e);
    }
  });

  socket.on("sdp", async (data) => {
    if (!pc[data.sender]) init(false, data.sender);
    try {
      if (data.description.type === "offer") {
        await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));

        if (!myStream) {
          myStream = await h.getUserFullMedia();
          const localEl = document.getElementById("local");
          if (localEl) { h.setLocalStream(myStream); }
          setupAudioVisualizer(myStream, "local-container");
        }

        myStream.getTracks().forEach((t) => pc[data.sender].addTrack(t, myStream));

        const answer = await pc[data.sender].createAnswer();
        await pc[data.sender].setLocalDescription(answer);

        socket.emit("sdp", {
          description: pc[data.sender].localDescription,
          to: data.sender,
          sender: socket.id,
        });
      } else if (data.description.type === "answer") {
        await pc[data.sender].setRemoteDescription(new RTCSessionDescription(data.description));
      }
    } catch (e) {
      console.error("SDP error:", e);
    }
  });

  socket.on("chat", (data) => {
    h.addChat(data, "remote");
  });
};

// ─── Subscribe ────────────────────────────────────────────────────────────────

// Server uses socket.id from the connection itself — only send name, token, room, accepted
const sendSubscribe = (meetingId, accepted = false) => {
  const username = sessionStorage.getItem("username") || "Guest";
  const token = getAdminToken();
  socket.emit("subscribe", {
    room: meetingId,
    token,
    name: username,
    accepted,
  });
};

// ─── Exported: Request to join (guest "Ask to Join" button) ──────────────────

export const requestAdmittance = (meetingId) => {
  currentMeetingId = meetingId;
  if (socket.connected) {
    sendSubscribe(meetingId, false);
  } else {
    socket.once("connect", () => sendSubscribe(meetingId, false));
  }
};

// ─── Exported: Host subscribes immediately ───────────────────────────────────

export const loadRtc = (meetingId, callbacks = {}) => {
  rtcCallbacks = { ...rtcCallbacks, ...callbacks };
  currentMeetingId = meetingId;
  initSocketListeners(meetingId);

  if (socket.connected) {
    sendSubscribe(meetingId);
  } else {
    socket.once("connect", () => sendSubscribe(meetingId));
  }

  setupUIListeners();
  getAndSetUserStream();
};

// ─── Exported: Init socket + camera preview for guest (no subscribe yet) ────

export const initGuestRtc = (meetingId, callbacks = {}) => {
  rtcCallbacks = { ...rtcCallbacks, ...callbacks };
  currentMeetingId = meetingId;
  initSocketListeners(meetingId);
  // Start camera for pre-join preview — no subscribe yet
  getAndSetUserStream();
};

// ─── Exported: Attach UI listeners after DOM renders for admitted guest ──────

export const attachUIListeners = () => {
  setupUIListeners();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const togglePreJoinMic = () => {
  if (!myStream || !myStream.getAudioTracks().length) return true;
  const track = myStream.getAudioTracks()[0];
  track.enabled = !track.enabled;
  return track.enabled;
};

export const togglePreJoinCamera = () => {
  if (!myStream || !myStream.getVideoTracks().length) return true;
  const track = myStream.getVideoTracks()[0];
  track.enabled = !track.enabled;
  return track.enabled;
};

export const getMyStream = () => myStream;

// ─── Stream ───────────────────────────────────────────────────────────────────

function getAndSetUserStream() {
  if (myStream) {
    // Already have stream — just attach to local element if present
    const localEl = document.getElementById("local");
    if (localEl && !localEl.srcObject) {
      h.setLocalStream(myStream);
      setupAudioVisualizer(myStream, "local-container");
    }
    return;
  }
  h.getUserFullMedia()
    .then((stream) => {
      myStream = stream;
      const localEl = document.getElementById("local");
      if (localEl) {
        h.setLocalStream(stream);
        setupAudioVisualizer(stream, "local-container");
      }
    })
    .catch((e) => console.error("stream error:", e));
}

function sendMsg(msg) {
  const username = sessionStorage.getItem("username") || "Guest";
  const room = sessionStorage.getItem("meetingId");
  const data = { room, msg, sender: username };
  socket.emit("chat", data);
  h.addChat(data, "local");
}

// ─── UI Listeners ─────────────────────────────────────────────────────────────

const setupUIListeners = () => {
  const attach = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el && !el.hasAttribute("data-listener-added")) {
      el.addEventListener(event, handler);
      el.setAttribute("data-listener-added", "true");
    }
  };

  attach("chat-input", "keypress", (e) => {
    if (e.which === 13 && e.target.value.trim()) {
      e.preventDefault();
      sendMsg(e.target.value);
      setTimeout(() => { e.target.value = ""; }, 50);
    }
  });

  attach("toggle-video", "click", (e) => {
    e.preventDefault();
    if (!myStream || !myStream.getVideoTracks().length) return;
    const track = myStream.getVideoTracks()[0];
    const elem = document.getElementById("toggle-video");
    if (track.enabled) {
      e.target.classList.replace("fa-video", "fa-video-slash");
      elem.classList.add("btn-inactive");
      elem.title = "Show Video";
    } else {
      e.target.classList.replace("fa-video-slash", "fa-video");
      elem.classList.remove("btn-inactive");
      elem.title = "Hide Video";
    }
    track.enabled = !track.enabled;
    broadcastNewTracks(myStream, "video");
  });

  attach("toggle-mute", "click", (e) => {
    e.preventDefault();
    if (!myStream || !myStream.getAudioTracks().length) return;
    const track = myStream.getAudioTracks()[0];
    const elem = document.getElementById("toggle-mute");
    if (track.enabled) {
      e.target.classList.replace("fa-microphone-alt", "fa-microphone-alt-slash");
      elem.classList.add("btn-inactive");
      elem.title = "Unmute";
    } else {
      e.target.classList.replace("fa-microphone-alt-slash", "fa-microphone-alt");
      elem.classList.remove("btn-inactive");
      elem.title = "Mute";
    }
    track.enabled = !track.enabled;
    broadcastNewTracks(myStream, "audio");
  });

  attach("share-screen", "click", (e) => {
    e.preventDefault();
    if (screen && screen.getVideoTracks().length && screen.getVideoTracks()[0].readyState !== "ended") {
      stopSharingScreen();
    } else {
      shareScreen();
    }
  });
};

// ─── WebRTC ───────────────────────────────────────────────────────────────────

function init(createOffer, partnerName) {
  if (pc[partnerName]) return;

  pc[partnerName] = new RTCPeerConnection(h.getIceServer());

  const addTracks = (stream) => {
    stream.getTracks().forEach((t) => pc[partnerName].addTrack(t, stream));
  };

  if (screen && screen.getTracks().length) {
    addTracks(screen);
  } else if (myStream) {
    addTracks(myStream);
  } else {
    h.getUserFullMedia()
      .then((stream) => {
        myStream = stream;
        addTracks(stream);
        const localEl = document.getElementById("local");
        if (localEl) { h.setLocalStream(stream); }
        setupAudioVisualizer(stream, "local-container");
      })
      .catch((e) => console.error("stream error:", e));
  }

  if (createOffer) {
    pc[partnerName].onnegotiationneeded = async () => {
      try {
        const offer = await pc[partnerName].createOffer();
        await pc[partnerName].setLocalDescription(offer);
        socket.emit("sdp", {
          description: pc[partnerName].localDescription,
          to: partnerName,
          sender: socket.id,
        });
      } catch (e) {
        console.error("Offer error:", e);
      }
    };
  }

  pc[partnerName].onicecandidate = ({ candidate }) => {
    socket.emit("ice candidates", { candidate, to: partnerName, sender: socket.id });
  };

  pc[partnerName].ontrack = (e) => {
    const str = e.streams[0];
    const existing = document.getElementById(`${partnerName}-video`);
    if (existing) {
      existing.srcObject = str;
    } else {
      const vid = document.createElement("video");
      vid.id = `${partnerName}-video`;
      vid.srcObject = str;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.className = "remote-video";

      const controls = document.createElement("div");
      controls.className = "remote-video-controls";
      controls.innerHTML = `<i class="fa fa-microphone text-app pr-3 mute-remote-mic" title="Mute"></i>
        <i class="fa fa-expand text-app expand-remote-video" title="Expand"></i>`;

      const nameBadge = document.createElement("div");
      nameBadge.className = "video-name-label";
      nameBadge.textContent = "Guest";

      const card = document.createElement("div");
      card.className = "card card-sm meet-video-container";
      card.id = partnerName;
      card.appendChild(vid);
      card.appendChild(controls);
      card.appendChild(nameBadge);

      const grid = document.getElementById("videos");
      if (grid) {
        grid.appendChild(card);
        h.adjustVideoElemSize();
        setupAudioVisualizer(str, partnerName);
      }
    }
  };

  pc[partnerName].onconnectionstatechange = () => {
    if (["disconnected", "failed", "closed"].includes(pc[partnerName].iceConnectionState)) {
      h.closeVideo(partnerName);
      delete pc[partnerName];
    }
  };

  pc[partnerName].onsignalingstatechange = () => {
    if (pc[partnerName].signalingState === "closed") {
      h.closeVideo(partnerName);
      delete pc[partnerName];
    }
  };
}

// ─── Screen Share ─────────────────────────────────────────────────────────────

function shareScreen() {
  h.shareScreen()
    .then((stream) => {
      h.toggleShareIcons(true);
      h.toggleVideoBtnDisabled(true);
      screen = stream;
      broadcastNewTracks(stream, "video", false);
      stream.getVideoTracks()[0].addEventListener("ended", stopSharingScreen);
    })
    .catch((e) => console.error(e));
}

function stopSharingScreen() {
  h.toggleVideoBtnDisabled(false);
  try {
    if (screen && screen.getTracks().length) {
      screen.getTracks().forEach((t) => t.stop());
    }
    h.toggleShareIcons(false);
    broadcastNewTracks(myStream, "video");
  } catch (e) {
    console.error(e);
  }
}

function broadcastNewTracks(stream, type, mirrorMode = true) {
  if (!stream) return;
  h.setLocalStream(stream, mirrorMode);
  const track = type === "audio" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
  for (const pName in pc) {
    if (pc[pName] && typeof pc[pName] === "object") {
      h.replaceTrack(track, pc[pName]);
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const admitUser = (meetingId, targetSocketId) => {
  if (socket) socket.emit("admit-user", { room: meetingId, socketId: targetSocketId });
};

export const rejectUser = (meetingId, targetSocketId) => {
  if (socket) socket.emit("reject-user", { room: meetingId, socketId: targetSocketId });
};

export const record = (type = "screen") => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    return type === "screen" ? recordScreen() : recordVideo();
  } else if (mediaRecorder.state === "paused") {
    mediaRecorder.resume();
  } else if (mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
};

function startRecording(stream) {
  const username = sessionStorage.getItem("username");
  mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  mediaRecorder.start(1000);
  mediaRecorder.ondataavailable = (e) => recordedStream.push(e.data);
  mediaRecorder.onstop = () => {
    h.saveRecordedStream(recordedStream, username);
    setTimeout(() => { recordedStream = []; }, 3000);
  };
  mediaRecorder.onerror = (e) => console.error(e);
}

const recordScreen = () => {
  if (screen && screen.getVideoTracks().length) { startRecording(screen); return true; }
  return h.shareScreen().then((s) => { startRecording(s); return true; }).catch(() => false);
};

const recordVideo = () => {
  if (myStream && myStream.getTracks().length) { startRecording(myStream); return true; }
  return h.getUserFullMedia().then((s) => { startRecording(s); return true; }).catch(() => false);
};
