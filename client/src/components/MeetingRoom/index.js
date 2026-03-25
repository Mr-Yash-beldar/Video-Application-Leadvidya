import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { loadEvents } from "../../helpers/events";
import {
  loadRtc,
  admitUser,
  rejectUser,
  requestAdmittance,
  initGuestRtc,
  togglePreJoinMic,
  togglePreJoinCamera,
  setupAudioVisualizer,
  getMyStream,
} from "../../helpers/rtc";
import { setParticipantName, getAdminToken, getMeetingPublic } from "../../services/room";
import { useParams, useHistory } from "react-router-dom";
import "./room.css";

// joinState: 'loading' | 'not-found' | 'not-started' | 'pre-join' | 'waiting' | 'joined'

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const history = useHistory();
  const isAdmin = !!getAdminToken();

  const [joinState, setJoinState] = useState("loading");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [participants, setParticipants] = useState([]);
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [guestName, setGuestName] = useState("");
  const [nameEntered, setNameEntered] = useState(false);

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const previewVideoRef = useRef(null);

  const callbacks = {
    onWaitingRoom: (isWaiting) => {
      if (isWaiting) setJoinState("waiting");
    },
    onJoinAccepted: () => {
      setJoinState("joined");
    },
    onUpdateParticipants: (data) => {
      setParticipants(data.participants || []);
      setWaitingUsers(data.waiting || []);
    },
  };

  // ── Step 1: Validate meeting exists ─────────────────────────────────────────
  useEffect(() => {
    sessionStorage.setItem("meetingId", meetingId);

    getMeetingPublic(meetingId)
      .then((body) => {
        const meeting = body.meeting;
        setMeetingTitle(meeting.title || meetingId);
        if (!meeting.started && !isAdmin) {
          setJoinState("not-started");
        } else if (isAdmin) {
          // Host: set name and join immediately
          setParticipantName("Host");
          setJoinState("joined");
          loadEvents();
          loadRtc(meetingId, callbacks);
        } else {
          // Guest: show name entry → then pre-join
          setJoinState("name-entry");
        }
      })
      .catch(() => {
        setJoinState("not-found");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  // ── Step 2: Guest enters name, init camera preview ──────────────────────────
  const handleNameSubmit = (e) => {
    e.preventDefault();
    const name = guestName.trim() || `Guest-${Math.floor(100 + Math.random() * 900)}`;
    setParticipantName(name);
    setNameEntered(true);
    setJoinState("pre-join");
    // Init socket listeners + camera preview (no subscribe yet)
    initGuestRtc(meetingId, callbacks);
  };

  // ── Attach camera preview to video element ───────────────────────────────
  useEffect(() => {
    if (joinState === "pre-join" || joinState === "waiting") {
      const attach = () => {
        const stream = getMyStream();
        if (stream && previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        } else {
          setTimeout(attach, 200);
        }
      };
      attach();
    }
  }, [joinState]);

  // ── When admitted: attach UI listeners after DOM renders ─────────────────
  useEffect(() => {
    if (joinState === "joined" && !isAdmin) {
      setTimeout(() => {
        setupUIListenersOnce();
        const stream = getMyStream();
        const localEl = document.getElementById("local");
        if (stream && localEl && !localEl.srcObject) {
          localEl.srcObject = stream;
          setupAudioVisualizer(stream, "local-container");
        }
      }, 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinState]);

  const setupUIListenersOnce = () => {
    // Re-use loadRtc to attach UI listeners without re-subscribing (socket is connected)
    loadRtc(meetingId, {}); // callbacks already set; this only attaches UI listeners
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleAskToJoin = () => {
    setJoinState("waiting");
    requestAdmittance(meetingId);
  };

  const handleToggleMic = () => {
    const enabled = togglePreJoinMic();
    setMicEnabled(enabled);
  };

  const handleToggleCamera = () => {
    const enabled = togglePreJoinCamera();
    setCameraEnabled(enabled);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // Loading
  if (joinState === "loading") {
    return (
      <div className="pre-join-screen">
        <div className="waiting-status" style={{ alignItems: "center" }}>
          <div className="waiting-spinner"></div>
          <p>Loading meeting…</p>
        </div>
      </div>
    );
  }

  // Invalid meeting
  if (joinState === "not-found") {
    return (
      <div className="pre-join-screen">
        <div className="pre-join-card" style={{ maxWidth: 480 }}>
          <div className="pre-join-info" style={{ alignItems: "center" }}>
            <h2 className="pre-join-title">Meeting not found</h2>
            <p className="pre-join-subtitle">The meeting ID <strong>{meetingId}</strong> doesn't exist.</p>
            <button className="ask-to-join-btn" style={{ marginTop: 8 }} onClick={() => history.push("/")}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Meeting exists but not started
  if (joinState === "not-started") {
    return (
      <div className="pre-join-screen">
        <div className="pre-join-card" style={{ maxWidth: 480 }}>
          <div className="pre-join-info" style={{ alignItems: "center" }}>
            <h2 className="pre-join-title">Class hasn't started yet</h2>
            <p className="pre-join-subtitle">{meetingTitle}</p>
            <p className="pre-join-subtitle">Please wait for the host to start the meeting.</p>
            <button className="leave-btn" style={{ marginTop: 8, width: "100%" }} onClick={() => history.push("/")}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guest: enter your name
  if (joinState === "name-entry") {
    return (
      <div className="pre-join-screen">
        <div className="pre-join-card" style={{ maxWidth: 480, flexDirection: "column" }}>
          <div className="pre-join-info" style={{ alignItems: "center" }}>
            <h2 className="pre-join-title">What's your name?</h2>
            <p className="pre-join-subtitle">{meetingTitle}</p>
            <form onSubmit={handleNameSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              <input
                className="name-input"
                type="text"
                placeholder="Enter your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="ask-to-join-btn">
                Continue
              </button>
              <button type="button" className="leave-btn" onClick={() => history.push("/")}>
                Back
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Pre-join / Waiting overlay
  if (joinState === "pre-join" || joinState === "waiting") {
    return (
      <div className="pre-join-screen">
        <div className="pre-join-card">
          {/* Camera preview */}
          <div className="pre-join-video-wrap">
            <video
              ref={previewVideoRef}
              className={`pre-join-video${cameraEnabled ? "" : " cam-off"}`}
              autoPlay
              muted
              playsInline
            />
            {!cameraEnabled && (
              <div className="cam-off-placeholder">
                <i className="fa fa-video-slash cam-off-icon"></i>
                <span>Camera is off</span>
              </div>
            )}
            <div className="pre-join-controls">
              <button
                className={`meet-btn control-btn${micEnabled ? "" : " btn-inactive"}`}
                onClick={handleToggleMic}
                title={micEnabled ? "Mute" : "Unmute"}
              >
                <i className={`fa ${micEnabled ? "fa-microphone-alt" : "fa-microphone-alt-slash"}`}></i>
              </button>
              <button
                className={`meet-btn control-btn${cameraEnabled ? "" : " btn-inactive"}`}
                onClick={handleToggleCamera}
                title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
              >
                <i className={`fa ${cameraEnabled ? "fa-video" : "fa-video-slash"}`}></i>
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div className="pre-join-info">
            <h2 className="pre-join-title">Ready to join?</h2>
            <p className="pre-join-subtitle">{meetingTitle}</p>

            {joinState === "waiting" ? (
              <div className="waiting-status">
                <div className="waiting-spinner"></div>
                <p>Waiting for the host to admit you…</p>
                <button className="leave-btn" onClick={() => history.push("/")}>Leave</button>
              </div>
            ) : (
              <div className="pre-join-actions">
                <button className="ask-to-join-btn" onClick={handleAskToJoin}>
                  Ask to join
                </button>
                <button className="leave-btn" onClick={() => history.push("/")}>Back</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Full Meeting Screen ───────────────────────────────────────────────────
  return (
    <div className="google-meet-layout">
      <div className={`meet-main${activeTab ? " with-sidebar" : ""}`} id="main-section">
        <div id="videos" className="meet-videos-grid">
          <div className="meet-video-container" id="local-container">
            <video className="local-video mirror-mode" id="local" autoPlay muted playsInline></video>
            <div className="video-name-label">
              You {isAdmin && <span className="host-badge">Host</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {activeTab && (
        <div className="meet-sidebar">
          <div className="sidebar-header">
            <h4>{activeTab === "people" ? "People" : "In-call messages"}</h4>
            <button className="close-sidebar-btn" onClick={() => setActiveTab(null)}>&times;</button>
          </div>

          <div className="sidebar-content">
            {activeTab === "people" && (
              <div className="people-tab">
                {isAdmin && waitingUsers.length > 0 && (
                  <div className="people-section">
                    <div className="section-title waitlist-badge">
                      WAITING ({waitingUsers.length})
                    </div>
                    <ul className="people-list">
                      {waitingUsers.map((u) => (
                        <li key={u.socketId} className="person-item">
                          <div className="person-avatar">{u.name.charAt(0).toUpperCase()}</div>
                          <div className="person-name">{u.name}</div>
                          <div className="person-actions">
                            <button className="admit-btn" onClick={() => admitUser(meetingId, u.socketId)}>
                              Admit
                            </button>
                            <button className="reject-btn" onClick={() => rejectUser(meetingId, u.socketId)}>
                              ✕
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="people-section">
                  <div className="section-title">IN THE MEETING ({Math.max(participants.length, 1)})</div>
                  <ul className="people-list">
                    {participants.map((u) => (
                      <li key={u.socketId} className="person-item">
                        <div className="person-avatar">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="person-name">
                          {u.name} {u.isAdmin && <span className="host-badge">Host</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className={`chat-tab${activeTab === "chat" ? " active" : " hidden"}`} id="chat-pane">
              <div className="chat-messages-container" id="chat-messages"></div>
              <div className="chat-input-container">
                <textarea id="chat-input" className="chat-box" placeholder="Send a message to everyone" rows="1"></textarea>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="meet-bottom-bar">
        <div className="bottom-left">
          <div className="time-id">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | {meetingId}
          </div>
        </div>

        <div className="bottom-center">
          <button className="meet-btn control-btn" id="toggle-mute" title="Mic">
            <i className="fa fa-microphone-alt"></i>
          </button>
          <button className="meet-btn control-btn" id="toggle-video" title="Camera">
            <i className="fa fa-video"></i>
          </button>
          {isAdmin && (
            <button className="meet-btn control-btn" id="share-screen" title="Present now">
              <i className="fa fa-desktop"></i>
            </button>
          )}
          <button className="meet-btn control-btn end-call-btn" title="Leave" onClick={() => history.push("/")}>
            <i className="fa fa-phone-slash"></i>
          </button>
        </div>

        <div className="bottom-right">
          <button
            className={`meet-btn side-btn${activeTab === "people" ? " active" : ""}`}
            onClick={() => setActiveTab(activeTab === "people" ? null : "people")}
            title="People"
          >
            {isAdmin && waitingUsers.length > 0 && (
              <span className="waiting-badge">{waitingUsers.length}</span>
            )}
            <i className="fa fa-users"></i>
          </button>
          <button
            className={`meet-btn side-btn${activeTab === "chat" ? " active" : ""}`}
            onClick={() => setActiveTab(activeTab === "chat" ? null : "chat")}
            title="Chat"
            id="toggle-chat-pane"
          >
            <i className="fa fa-comment-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;
