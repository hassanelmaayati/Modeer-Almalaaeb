const API_BASE = "";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { ...options.headers };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = "An error occurred";
    try {
      const err = await res.json();
      errorDetail = err.detail || err.message || errorDetail;
    } catch (e) {}
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Auth
  signup: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  // Users
  getMe: () => request("/users/me"),
  updateMe: (data) => request("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
  getUser: (id) => request(`/users/${id}`),
  getUserRatings: (id) => request(`/users/${id}/ratings`),
  uploadAvatar: (formData) => request("/users/me/avatar", { method: "POST", body: formData }),

  // Sports
  getSports: () => request("/sports"),

  // Rooms
  getRooms: (params = {}) => {
    const query = new URLSearchParams();
    if (params.sport_id) query.append("sport_id", params.sport_id);
    if (params.skill_level) query.append("skill_level", params.skill_level);
    if (params.format) query.append("format", params.format);
    if (params.status) query.append("status", params.status);
    return request(`/rooms?${query.toString()}`);
  },
  createRoom: (data) => request("/rooms", { method: "POST", body: JSON.stringify(data) }),
  getRoom: (id) => request(`/rooms/${id}`),
  updateRoom: (id, data) => request(`/rooms/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  cancelRoom: (id) => request(`/rooms/${id}`, { method: "DELETE" }),
  joinRoomRest: (id, data) => request(`/rooms/${id}/join`, { method: "POST", body: JSON.stringify(data) }),

  // Join Requests
  createJoinRequest: (roomId, data) => request(`/rooms/${roomId}/join-requests`, { method: "POST", body: JSON.stringify(data) }),
  getJoinRequests: (roomId) => request(`/rooms/${roomId}/join-requests`),
  resolveJoinRequest: (roomId, requestId, status) => request(`/rooms/${roomId}/join-requests/${requestId}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Ratings
  submitRatings: (roomId, ratings) => request(`/rooms/${roomId}/ratings`, { method: "POST", body: JSON.stringify({ ratings }) }),
};
