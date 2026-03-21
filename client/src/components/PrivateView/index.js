import React, { useState } from "react";
import Header from "../HeaderPrimary";
import { Footer } from "../Footer";
import Button from "react-bootstrap/Button";
import { useHistory } from "react-router-dom";
import { getMeetingPublic, setParticipantName } from "../../services/room";

function PrivateView() {
  const history = useHistory();
  const [meetingId, setMeetingId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const joinMeeting = async () => {
    const trimmedMeetingId = meetingId.trim();
    if (!trimmedMeetingId) {
      setError("Meeting ID is required.");
      return;
    }

    setError("");
    try {
      setLoading(true);
      const data = await getMeetingPublic(trimmedMeetingId);
      if (!data.meeting.started) {
        setError("Meeting is created but not started by admin yet.");
        return;
      }

      setParticipantName(name);
      history.push(`/${trimmedMeetingId}`);
    } catch (err) {
      setError(err.message || "Unable to join meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="container-fluid py-5" id="username-set">
        <div className="row">
          <div className="col-12 col-md-5 offset-md-3">
            <div className="lv-card">
              <h3 className="lv-card-title">Join LeadVidya Class</h3>
              <p className="lv-card-subtitle">
                Enter the meeting ID shared by your admin.
              </p>

              <div className="mb-3">
                <label htmlFor="meeting-id">Meeting ID</label>
                <input
                  type="text"
                  id="meeting-id"
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="form-control lv-input"
                  placeholder="example: ab12-cd34"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="username">Your Name</label>
                <input
                  type="text"
                  id="username"
                  onChange={(e) => setName(e.target.value)}
                  className="form-control lv-input"
                  placeholder="Learner Name"
                />
              </div>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <Button
                className="lv-btn-primary"
                size="lg"
                style={{ width: "100%" }}
                onClick={joinMeeting}
                disabled={loading}
              >
                {loading ? "Checking..." : "Join Meeting"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default PrivateView;
