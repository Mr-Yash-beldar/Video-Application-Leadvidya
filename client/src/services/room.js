const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const ADMIN_TOKEN_KEY = "leadvidya_admin_token";

const parseResponse = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }
  return body;
};

const authHeaders = () => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const adminLogin = async (adminId, password) => {
  const response = await fetch(`${API_URL}/api/auth/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, password }),
  });
  const body = await parseResponse(response);
  localStorage.setItem(ADMIN_TOKEN_KEY, body.token);
  return body;
};

export const logoutAdmin = () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
};

export const isAdminLoggedIn = () => {
  return !!localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const getAdminToken = () => {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

export const createMeeting = async (title) => {
  const response = await fetch(`${API_URL}/api/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ title }),
  });
  return parseResponse(response);
};

export const startMeeting = async (meetingId) => {
  const response = await fetch(`${API_URL}/api/meetings/${meetingId}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  return parseResponse(response);
};

export const getMeetingPublic = async (meetingId) => {
  const response = await fetch(`${API_URL}/api/meetings/${meetingId}/public`);
  return parseResponse(response);
};

export const setParticipantName = (name) => {
  const participant =
    (name || "").trim() || `Guest-${Math.floor(100 + Math.random() * 900)}`;
  sessionStorage.setItem("username", participant);
  return participant;
};
