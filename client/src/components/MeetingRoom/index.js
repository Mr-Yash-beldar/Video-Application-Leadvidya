import * as React from "react";
import { useEffect, useState } from "react";
import { loadEvents } from "../../helpers/events";
import { loadRtc, admitUser } from "../../helpers/rtc";
import { setParticipantName, getAdminToken } from "../../services/room";
import { useParams, useHistory } from "react-router-dom";
import "./room.css";

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const [isWaiting, setIsWaiting] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("people"); // 'people', 'chat', or null
  const history = useHistory();
  const isAdmin = !!getAdminToken();

  useEffect(() => {
    if (!sessionStorage.getItem("username")) {
      setParticipantName(isAdmin ? "Host" : "Guest");
    }
    loadEvents();
    loadRtc(meetingId, {
      onWaitingRoom: (waiting) => setIsWaiting(waiting),
      onUpdateParticipants: (data) => {
        setParticipants(data.participants || []);
        setWaitingUsers(data.waiting || []);
      },
    });
  }, [meetingId]);

  if (isWaiting) {
    return (
      <div className="waiting-room-screen">
        <h2>Waiting to be admitted</h2>
        <p>You will join the class once the admin admits you.</p>
        <button className="btn btn-secondary mt-3" onClick={() => history.push("/")}>
          Leave
        </button>
      </div>
    );
  }

  return (
    <div className="google-meet-layout">
      {/* Top Left Info (Optional) */}

      {/* Main Video Area */}
      <div className={`meet-main ${activeTab ? "with-sidebar" : ""}`} id="main-section">
        <div id="videos" className="meet-videos-grid">
          {/* Local Video injected by RTC.js */}
          <div className="meet-video-container local-container">
            <video className="local-video mirror-mode" id="local" autoPlay muted playsInline></video>
            <div className="video-name-label">You</div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      {activeTab && (
        <div className="meet-sidebar bg-app-secondary">
          <div className="sidebar-header">
            <h4>{activeTab === "people" ? "People" : "In-call messages"}</h4>
            <button className="close-sidebar-btn" onClick={() => setActiveTab(null)}>
              &times;
            </button>
          </div>

          <div className="sidebar-content">
            {activeTab === "people" && (
              <div className="people-tab">
                {/* Waiting Room Section (Admin only) */}
                {isAdmin && waitingUsers.length > 0 && (
                  <div className="people-section">
                    <div className="section-title">
                      WAITING TO JOIN ({waitingUsers.length})
                    </div>
                    <ul className="people-list">
                      {waitingUsers.map((u) => (
                        <li key={u.socketId} className="person-item">
                          <div className="person-avatar">{u.name.charAt(0).toUpperCase()}</div>
                          <div className="person-name">{u.name}</div>
                          <div className="person-actions">
                            <button
                              className="admit-btn"
                              onClick={() => admitUser(meetingId, u.socketId)}
                            >
                              Admit
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* In the Meeting Section */}
                <div className="people-section">
                  <div className="section-title">IN THE MEETING ({participants.length || 1})</div>
                  <ul className="people-list">
                    {/* participants array from socket */}
                    {participants.map((u) => (
                      <li key={u.socketId} className="person-item">
                        <div className="person-avatar">{u.name.charAt(0).toUpperCase()}</div>
                        <div className="person-name">
                          {u.name} {u.isAdmin && "(Host)"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className={`chat-tab ${activeTab === "chat" ? "active" : "hidden"}`} id="chat-pane">
              <div className="chat-messages-container" id="chat-messages"></div>
              <div className="chat-input-container">
                <textarea
                  id="chat-input"
                  className="chat-box"
                  placeholder="Send a message to everyone"
                  rows="1"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="meet-bottom-bar">
        <div className="bottom-left">
          <div className="time-id">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} | {meetingId}
          </div>
        </div>

        <div className="bottom-center">
          <button className="meet-btn control-btn" id="toggle-mute" title="Turn on/off microphone">
            <i className="fa fa-microphone-alt"></i>
          </button>
          <button className="meet-btn control-btn" id="toggle-video" title="Turn on/off camera">
            <i className="fa fa-video"></i>
          </button>
          <button className="meet-btn control-btn" id="share-screen" title="Present now">
            <i className="fa fa-desktop"></i>
          </button>
          {/* Dummy hidden elements needed by events.js if any, like toggle-chat-pane etc, we handle chat internally now, but keeping for safety */}
          <button
            className="meet-btn control-btn end-call-btn"
            title="Leave call"
            onClick={() => history.push("/")}
          >
            <i className="fa fa-phone-slash"></i>
          </button>
        </div>

        <div className="bottom-right">
          <button
            className={`meet-btn side-btn ${activeTab === "people" ? "active" : ""}`}
            onClick={() => setActiveTab(activeTab === "people" ? null : "people")}
            title="Show everyone"
          >
            <i className="fa fa-users"></i>
          </button>
          <button
            className={`meet-btn side-btn ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab(activeTab === "chat" ? null : "chat")}
            title="Chat with everyone"
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
