import * as React from "react";
import Button from "react-bootstrap/Button";
import {
  adminLogin,
  createMeeting,
  isAdminLoggedIn,
  logoutAdmin,
  startMeeting,
} from "../../services/room";

export const PrivateMeeting = () => {
  const [adminId, setAdminId] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [meetingTitle, setMeetingTitle] = React.useState("LeadVidya Class");
  const [meetingId, setMeetingId] = React.useState("");
  const [started, setStarted] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(isAdminLoggedIn());

  const onAdminLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      setLoading(true);
      await adminLogin(adminId.trim(), password);
      setLoggedIn(true);
      setMessage("Admin authenticated successfully.");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const onCreateMeeting = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      setLoading(true);
      const data = await createMeeting(meetingTitle);
      setMeetingId(data.meeting.id);
      setStarted(false);
      setMessage("Meeting created. Start it to allow participants to join.");
    } catch (err) {
      setError(err.message || "Could not create meeting.");
    } finally {
      setLoading(false);
    }
  };

  const onStartMeeting = async () => {
    if (!meetingId) {
      setError("Create a meeting first.");
      return;
    }

    setError("");
    setMessage("");
    try {
      setLoading(true);
      await startMeeting(meetingId);
      setStarted(true);
      setMessage("Meeting is now live and joinable by anyone.");
    } catch (err) {
      setError(err.message || "Could not start meeting.");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    logoutAdmin();
    setLoggedIn(false);
    setMeetingId("");
    setStarted(false);
    setMessage("Admin logged out.");
  };

  const meetingLink = meetingId ? `${window.location.origin}/${meetingId}` : "";

  return (
    <div className="lv-card lv-card-admin">
      <h3 className="lv-card-title">Admin Console</h3>
      <p className="lv-card-subtitle">
        Only authenticated admin can create and start meetings.
      </p>

      {!loggedIn && (
        <form onSubmit={onAdminLogin}>
          <div className="form-group mb-3">
            <label htmlFor="admin-id">Admin ID</label>
            <input
              id="admin-id"
              value={adminId}
              onChange={(event) => setAdminId(event.target.value)}
              className="form-control lv-input"
              placeholder="Admin ID"
            />
          </div>
          <div className="form-group mb-3">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="form-control lv-input"
              placeholder="Password"
            />
          </div>
          <Button
            className="lv-btn-primary"
            type="submit"
            disabled={loading}
            block
          >
            {loading ? "Authenticating..." : "Admin Login"}
          </Button>
        </form>
      )}

      {loggedIn && (
        <>
          <form onSubmit={onCreateMeeting}>
            <div className="form-group mb-3">
              <label htmlFor="meeting-title">Class Title</label>
              <input
                id="meeting-title"
                value={meetingTitle}
                onChange={(event) => setMeetingTitle(event.target.value)}
                className="form-control lv-input"
                placeholder="LeadVidya Mathematics - Grade 8"
              />
            </div>
            <Button
              className="lv-btn-primary"
              type="submit"
              disabled={loading}
              block
            >
              {loading ? "Creating..." : "Create Meeting"}
            </Button>
          </form>

          <Button
            className="lv-btn-secondary mt-2"
            onClick={onStartMeeting}
            disabled={!meetingId || loading}
            block
          >
            {loading ? "Starting..." : "Start Meeting"}
          </Button>

          <Button
            variant="outline-light"
            className="mt-2"
            onClick={onLogout}
            block
          >
            Logout Admin
          </Button>
        </>
      )}

      {error && <div className="alert alert-danger py-2 mt-3">{error}</div>}
      {message && (
        <div className="alert alert-success py-2 mt-3">{message}</div>
      )}

      {meetingId && (
        <div className="lv-meeting-meta mt-3">
          <div>
            <strong>Meeting ID:</strong> {meetingId}
          </div>
          <div>
            <strong>Status:</strong>{" "}
            {started ? "Live" : "Created (not started)"}
          </div>
          <div>
            <strong>Share Link:</strong> <a href={meetingLink}>{meetingLink}</a>
          </div>
        </div>
      )}
    </div>
  );
};
