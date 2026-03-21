import * as React from "react";
import { useHistory } from "react-router-dom";
import Button from "react-bootstrap/Button";
import { getMeetingPublic, setParticipantName } from "../../services/room";

export const Home = () => {
  const history = useHistory();
  const [meetingId, setMeetingId] = React.useState("");
  const [participant, setParticipant] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const joinMeeting = async (event) => {
    event.preventDefault();
    setError("");
    const trimmedMeetingId = meetingId.trim();
    if (!trimmedMeetingId) {
      setError("Meeting ID is required.");
      return;
    }

    try {
      setLoading(true);
      const data = await getMeetingPublic(trimmedMeetingId);
      if (!data.meeting.started) {
        setError("This meeting exists but has not started yet.");
        return;
      }

      setParticipantName(participant);
      history.push(`/${trimmedMeetingId}`);
    } catch (err) {
      setError(err.message || "Could not join this meeting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lv-card">
      <h3 className="lv-card-title">Join a Class</h3>
      <p className="lv-card-subtitle">
        Anyone with a meeting ID can join after admin starts the class.
      </p>

      <form onSubmit={joinMeeting}>
        <div className="form-group mb-3">
          <label htmlFor="meeting-id">Meeting ID</label>
          <input
            id="meeting-id"
            type="text"
            value={meetingId}
            onChange={(event) => setMeetingId(event.target.value)}
            className="form-control lv-input"
            placeholder="example: ab12-cd34"
          />
        </div>

        <div className="form-group mb-3">
          <label htmlFor="participant-name">Your Name</label>
          <input
            id="participant-name"
            type="text"
            value={participant}
            onChange={(event) => setParticipant(event.target.value)}
            className="form-control lv-input"
            placeholder="Learner Name"
          />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <Button
          className="lv-btn-primary"
          type="submit"
          disabled={loading}
          block
        >
          {loading ? "Checking Meeting..." : "Join Meeting"}
        </Button>
      </form>
    </div>
  );
};
