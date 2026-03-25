// API Service for Backend Communication
//export const API_BASE_URL = 'https://shebahub.hitheal.org.il:8085/api';
export const API_BASE_URL = "http://localhost:8000/api"; // For local development

// ---------------- Token helpers ----------------
const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isAccessTokenValid = (token) => {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const skewMs = 30 * 1000; // 30s clock skew
  return payload.exp * 1000 > Date.now() + skewMs;
};

// Token management
const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");
const setTokens = (access, refresh) => {
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
};
const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  // Notify React context(s) that auth has been cleared
  window.dispatchEvent(new Event("auth:logout"));
};

// Create headers with authentication
const getHeaders = (includeAuth = true, isFormData = false) => {
  const headers = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (includeAuth) {
    const token = getAccessToken();
    if (token && isAccessTokenValid(token)) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Handle API response
const handleResponse = async (response) => {
  if (response.status === 204) {
    if (!response.ok) {
      throw { status: response.status, data: {} };
    }
    return {};
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw { status: response.status, data };
  }

  return data;
};

// Refresh mutex — concurrent 401s share a single refresh call
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("accessToken", data.access);
        if (data.refresh) localStorage.setItem("refreshToken", data.refresh);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// API request wrapper (auto-retries once after refresh on 401)
const apiRequest = async (endpoint, options = {}) => {
  const { method = "GET", body, auth = true, isFormData = false } = options;

  const config = {
    method,
    headers: getHeaders(auth, isFormData),
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response = await fetch(url, config);

  // If unauthorized and we have a refresh token, try refresh + retry once
  if (auth && response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retryConfig = {
        ...config,
        headers: getHeaders(auth, isFormData),
      };
      response = await fetch(url, retryConfig);
    } else {
      clearTokens();
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
  }

  return handleResponse(response);
};

// ============== AUTH API ==============

export const authAPI = {
  // Register new user
  signup: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw { status: response.status, data };
    }

    // Save tokens and user data
    if (data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw { status: response.status, data };
    }

    // Save tokens and user data
    if (data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  },

  // Logout user (blacklist refresh token on server, then clear local tokens)
  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      } catch {
        /* ignore */
      }
    }
    clearTokens();
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  // Fetch fresh user data from the server
  fetchMe: () => apiRequest("/auth/me/"),

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = getAccessToken();
    return isAccessTokenValid(token);
  },

  // Password reset
  requestPasswordReset: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw { status: response.status, data };
    return data;
  },

  confirmPasswordReset: async (uid, token, password, confirmPassword) => {
    const response = await fetch(
      `${API_BASE_URL}/auth/password-reset/confirm/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, password, confirmPassword }),
      },
    );
    const data = await response.json();
    if (!response.ok) throw { status: response.status, data };
    return data;
  },

  // Email verification
  verifyEmail: async (uid, token) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, token }),
    });
    const data = await response.json();
    if (!response.ok) throw { status: response.status, data };
    return data;
  },

  resendVerification: () =>
    apiRequest("/auth/resend-verification/", { method: "POST" }),
};

// ============== PROFILES API ==============

export const profilesAPI = {
  // Get mentor profile of current user
  getMyMentorProfile: () => apiRequest("/profiles/mentor/me/"),

  // Create mentor profile
  createMentorProfile: (profileData) =>
    apiRequest("/profiles/mentor/me/", {
      method: "POST",
      body: profileData,
    }),

  // Update mentor profile (partial update)
  updateMentorProfile: (profileData) =>
    apiRequest("/profiles/mentor/me/", {
      method: "PATCH",
      body: profileData,
    }),

  // Get student profile of current user
  getMyStudentProfile: () => apiRequest("/profiles/student/me/"),

  // Create student profile
  createStudentProfile: (profileData) =>
    apiRequest("/profiles/student/me/", {
      method: "POST",
      body: profileData,
    }),

  // Update student profile (partial update)
  updateStudentProfile: (profileData) =>
    apiRequest("/profiles/student/me/", {
      method: "PATCH",
      body: profileData,
    }),

  // Upload avatar image
  uploadAvatar: async (file, profileType = "mentor") => {
    const formData = new FormData();
    formData.append("avatar", file);
    const endpoint =
      profileType === "mentor"
        ? "/profiles/mentor/me/avatar/"
        : "/profiles/student/me/avatar/";
    return apiRequest(endpoint, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  // Delete avatar
  deleteAvatar: (profileType = "mentor") => {
    const endpoint =
      profileType === "mentor"
        ? "/profiles/mentor/me/avatar/"
        : "/profiles/student/me/avatar/";
    return apiRequest(endpoint, { method: "DELETE" });
  },

  // Upload document
  uploadDocument: async (
    file,
    profileType = "mentor",
    documentType = "OTHER",
    description = "",
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);
    formData.append("description", description);
    const endpoint =
      profileType === "mentor"
        ? "/profiles/mentor/me/documents/"
        : "/profiles/student/me/documents/";
    return apiRequest(endpoint, {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  // Delete document
  deleteDocument: (documentId, profileType = "mentor") => {
    const endpoint =
      profileType === "mentor"
        ? `/profiles/mentor/me/documents/${documentId}/`
        : `/profiles/student/me/documents/${documentId}/`;
    return apiRequest(endpoint, { method: "DELETE" });
  },

  // List all mentors (authenticated)
  listMentors: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/profiles/mentors/${queryString ? "?" + queryString : ""}`,
    );
  },

  // Get specific mentor by ID (public)
  getMentor: (id) => apiRequest(`/profiles/mentors/${id}/`, { auth: true }),

  // List all students (authenticated)
  listStudents: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/profiles/students/${queryString ? "?" + queryString : ""}`,
    );
  },

  // Get specific student by ID (public)
  getStudent: (id) => apiRequest(`/profiles/students/${id}/`, { auth: true }),
};

// ============== RESEARCH API ==============

const buildResearchFormData = (data, options = {}) => {
  const { removeContract = false } = options;
  const formData = new FormData();

  const appendIfPresent = (key, value) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    formData.append(key, value);
  };

  appendIfPresent("researchName", data.researchName);
  appendIfPresent("description", data.description);
  appendIfPresent("researchArea", data.researchArea);
  appendIfPresent("mentors", data.mentors);
  appendIfPresent("teamSize", data.teamSize);
  appendIfPresent("startDate", data.startDate);
  appendIfPresent("estimatedCompletionDate", data.estimatedCompletionDate);
  appendIfPresent("weeklyHours", data.weeklyHours);
  appendIfPresent("durationMonths", data.durationMonths);
  // compensation is a JSON array (primary compensation)
  if (Array.isArray(data.compensation) && data.compensation.length > 0) {
    formData.append("compensation", JSON.stringify(data.compensation));
  }
  if (Array.isArray(data.academicTracks) && data.academicTracks.length > 0) {
    formData.append("academic_tracks", JSON.stringify(data.academicTracks));
  }
  appendIfPresent("workMode", data.workMode);
  appendIfPresent("requirements", data.requirements);
  appendIfPresent("skillsAndTools", data.skillsAndTools);
  appendIfPresent("output", data.output);
  appendIfPresent("location", data.location);
  appendIfPresent("status", data.status);
  appendIfPresent("helsinkiApproval", data.helsinkiApproval);
  appendIfPresent("dataType", data.dataType);
  if (data.accepting_applications !== undefined) {
    formData.append("accepting_applications", data.accepting_applications);
  }
  if (data.contract instanceof File) {
    appendIfPresent("contract", data.contract);
  }

  if (removeContract) {
    formData.append("remove_contract", "1");
  }

  return formData;
};

export const researchAPI = {
  // Authenticated read
  listResearches: () => apiRequest("/research/"),
  getResearch: (id) => apiRequest(`/research/${id}/`),

  // Authenticated read: approved applicants list (for real research view)
  listApprovedApplicants: (id) =>
    apiRequest(`/research/${id}/approved-applicants/`),

  // Current user: researches they joined (approved applications)
  listJoinedResearches: () => apiRequest("/research/joined/"),

  // Student: apply/cancel + check status
  applyToResearch: (id) =>
    apiRequest(`/research/${id}/apply/`, { method: "POST" }),
  cancelMyApplication: (id) =>
    apiRequest(`/research/${id}/cancel/`, { method: "DELETE" }),
  leaveResearch: (id) =>
    apiRequest(`/research/${id}/leave/`, { method: "POST" }),
  getMyApplication: (id) => apiRequest(`/research/${id}/my-application/`),

  // Applicant dashboard: all my applications across all researches
  listMyApplications: (statusFilter = "all") =>
    apiRequest(
      `/research/my-applications/?status=${encodeURIComponent(statusFilter)}`,
    ),

  // Contact research owner (secure messaging without exposing email)
  contactResearchOwner: (id, message) =>
    apiRequest(`/research/${id}/contact/`, {
      method: "POST",
      body: { message },
    }),

  // Mentor-only: manage own researches
  listMyResearches: () => apiRequest("/research/me/"),
  getMyResearch: (id) => apiRequest(`/research/me/${id}/`),
  createMyResearch: (data) => {
    const formData = buildResearchFormData(data);
    return apiRequest("/research/me/", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  },

  updateMyResearch: (id, data, options = {}) => {
    const formData = buildResearchFormData(data, options);
    return apiRequest(`/research/me/${id}/`, {
      method: "PATCH",
      body: formData,
      isFormData: true,
    });
  },

  deleteMyResearch: (id) =>
    apiRequest(`/research/me/${id}/`, { method: "DELETE" }),

  // Mentor: review applications
  listMyResearchApplications: (researchId, status = "pending") =>
    apiRequest(
      `/research/me/${researchId}/applications/?status=${encodeURIComponent(status)}`,
    ),
  approveResearchApplication: (researchId, applicationId, note = "") =>
    apiRequest(
      `/research/me/${researchId}/applications/${applicationId}/approve/`,
      {
        method: "POST",
        body: note ? { note } : undefined,
      },
    ),
  rejectResearchApplication: (researchId, applicationId, note = "") =>
    apiRequest(
      `/research/me/${researchId}/applications/${applicationId}/reject/`,
      {
        method: "POST",
        body: note ? { note } : undefined,
      },
    ),
  removeResearchStudent: (researchId, applicationId, note = "") =>
    apiRequest(
      `/research/me/${researchId}/applications/${applicationId}/remove/`,
      {
        method: "POST",
        body: note ? { note } : undefined,
      },
    ),

  // Mentor: invite a student to a research
  inviteStudent: (researchId, userId) =>
    apiRequest(`/research/me/${researchId}/invite/`, {
      method: "POST",
      body: { user_id: userId },
    }),

  // Mentor: update permissions on another mentor's application (owner-only)
  updateMentorPermissions: (researchId, applicationId, permissions) =>
    apiRequest(
      `/research/me/${researchId}/applications/${applicationId}/permissions/`,
      {
        method: "PATCH",
        body: permissions,
      },
    ),

  // Student: accept/decline a research invitation
  acceptInvite: (researchId) =>
    apiRequest(`/research/${researchId}/accept-invite/`, { method: "POST" }),
  declineInvite: (researchId) =>
    apiRequest(`/research/${researchId}/decline-invite/`, { method: "POST" }),

  // Chat
  getChatMessages: (researchId, { before, after, limit } = {}) => {
    const params = new URLSearchParams();
    if (before) params.set("before", before);
    if (after) params.set("after", after);
    if (limit) params.set("limit", limit);
    const qs = params.toString();
    return apiRequest(`/research/me/${researchId}/chat/${qs ? "?" + qs : ""}`);
  },
  sendChatMessage: (researchId, body, file) => {
    if (file) {
      const formData = new FormData();
      if (body) formData.append("body", body);
      formData.append("file", file);
      return apiRequest(`/research/me/${researchId}/chat/`, {
        method: "POST",
        body: formData,
        isFormData: true,
      });
    }
    return apiRequest(`/research/me/${researchId}/chat/`, {
      method: "POST",
      body: { body },
    });
  },
  deleteChatMessage: (researchId, messageId) =>
    apiRequest(`/research/me/${researchId}/chat/${messageId}/`, {
      method: "DELETE",
    }),
  togglePinMessage: (researchId, messageId) =>
    apiRequest(`/research/me/${researchId}/chat/${messageId}/pin/`, {
      method: "POST",
    }),
  getChatSettings: (researchId) =>
    apiRequest(`/research/me/${researchId}/chat/settings/`),
  updateChatSettings: (researchId, settings) =>
    apiRequest(`/research/me/${researchId}/chat/settings/`, {
      method: "PATCH",
      body: settings,
    }),
  markChatSeen: (researchId, messageId) =>
    apiRequest(`/research/me/${researchId}/chat/seen/`, {
      method: "POST",
      body: { message_id: messageId },
    }),
  getLastSeenChatMessage: (researchId) =>
    apiRequest(`/research/me/${researchId}/chat/seen/`),
  getChatMembers: (researchId) =>
    apiRequest(`/research/me/${researchId}/chat/members/`),
};

// ============== REFERENCE DATA API ==============

export const referenceAPI = {
  // Get all reference data
  getAll: () => apiRequest("/reference-data/"),

  // Get specific reference data
  getSpecialties: () => apiRequest("/reference-data/specialties/"),
  getInstitutions: () => apiRequest("/reference-data/institutions/"),
  getDegrees: () => apiRequest("/reference-data/degrees/"),
  getAcademicRanks: () => apiRequest("/reference-data/academic-ranks/"),
  getResearchInterests: () => apiRequest("/reference-data/research-interests/"),
  getMedicalTrainingStages: () =>
    apiRequest("/reference-data/medical-training-stages/"),
  getWorkTypes: () => apiRequest("/reference-data/work-types/"),
  getCompensationPreferences: () =>
    apiRequest("/reference-data/compensation-preferences/"),
  getParticipationModes: () =>
    apiRequest("/reference-data/participation-modes/"),
  getProfessionalExperience: () =>
    apiRequest("/reference-data/professional-experience/"),
};

// ============== MESSAGES API ==============

export const messagesAPI = {
  getInbox: () => apiRequest("/research/messages/inbox/"),
  getUnreadCount: () => apiRequest("/research/messages/unread-count/"),
  markRead: (id) =>
    apiRequest(`/research/messages/${id}/read/`, { method: "PATCH" }),
  markAllRead: () =>
    apiRequest("/research/messages/mark-all-read/", { method: "PATCH" }),
  contactUser: (recipientId, subject, message) =>
    apiRequest("/research/messages/contact-user/", {
      method: "POST",
      body: { recipient_id: recipientId, subject, message },
    }),
};

// ============== ADMIN PANEL API ==============

// Helper to download a file from an API endpoint (CSV export etc.)
const downloadFile = async (endpoint, filename) => {
  const token = getAccessToken();
  const headers = {};
  if (token && isAccessTokenValid(token)) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const adminAPI = {
  // Dashboard
  getStats: () => apiRequest("/admin-panel/stats/"),

  // Research moderation
  listResearches: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/admin-panel/researches/${queryString ? "?" + queryString : ""}`,
    );
  },
  approveResearch: (id, note = "") =>
    apiRequest(`/admin-panel/researches/${id}/approve/`, {
      method: "POST",
      body: note ? { note } : undefined,
    }),
  rejectResearch: (id, note = "") =>
    apiRequest(`/admin-panel/researches/${id}/reject/`, {
      method: "POST",
      body: note ? { note } : undefined,
    }),
  flagResearch: (id, note = "") =>
    apiRequest(`/admin-panel/researches/${id}/flag/`, {
      method: "POST",
      body: note ? { note } : undefined,
    }),
  softDeleteResearch: (id, note = "") =>
    apiRequest(`/admin-panel/researches/${id}/soft-delete/`, {
      method: "POST",
      body: note ? { note } : undefined,
    }),
  restoreResearch: (id) =>
    apiRequest(`/admin-panel/researches/${id}/restore/`, { method: "POST" }),
  editResearch: (id, data) =>
    apiRequest(`/admin-panel/researches/${id}/edit/`, {
      method: "PATCH",
      body: data,
    }),
  bulkResearchAction: (ids, action, note = "") =>
    apiRequest("/admin-panel/researches/bulk/", {
      method: "POST",
      body: { ids, action, note },
    }),
  exportResearchesCsv: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return downloadFile(
      `/admin-panel/researches/export/${queryString ? "?" + queryString : ""}`,
      "researches.csv",
    );
  },

  // User management
  listUsers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/admin-panel/users/${queryString ? "?" + queryString : ""}`,
    );
  },
  getUser: (id) => apiRequest(`/admin-panel/users/${id}/`),
  editUser: (id, data) =>
    apiRequest(`/admin-panel/users/${id}/edit/`, {
      method: "PATCH",
      body: data,
    }),
  deactivateUser: (id) =>
    apiRequest(`/admin-panel/users/${id}/deactivate/`, { method: "POST" }),
  reactivateUser: (id) =>
    apiRequest(`/admin-panel/users/${id}/reactivate/`, { method: "POST" }),
  forceVerifyUser: (id) =>
    apiRequest(`/admin-panel/users/${id}/force-verify/`, { method: "POST" }),
  bulkUserAction: (ids, action) =>
    apiRequest("/admin-panel/users/bulk/", {
      method: "POST",
      body: { ids, action },
    }),
  exportUsersCsv: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return downloadFile(
      `/admin-panel/users/export/${queryString ? "?" + queryString : ""}`,
      "users.csv",
    );
  },

  // Audit logs
  getLogs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/admin-panel/logs/${queryString ? "?" + queryString : ""}`,
    );
  },
  exportLogsCsv: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return downloadFile(
      `/admin-panel/logs/export/${queryString ? "?" + queryString : ""}`,
      "admin_logs.csv",
    );
  },

  // Site settings
  getSettings: () => apiRequest("/admin-panel/settings/"),
  updateSettings: (data) =>
    apiRequest("/admin-panel/settings/", { method: "PATCH", body: data }),

  // Announcements
  listAnnouncements: () => apiRequest("/admin-panel/announcements/"),
  createAnnouncement: (data) =>
    apiRequest("/admin-panel/announcements/create/", {
      method: "POST",
      body: data,
    }),
  updateAnnouncement: (id, data) =>
    apiRequest(`/admin-panel/announcements/${id}/update/`, {
      method: "PATCH",
      body: data,
    }),
  deactivateAnnouncement: (id) =>
    apiRequest(`/admin-panel/announcements/${id}/deactivate/`, {
      method: "POST",
    }),
  getActiveAnnouncements: () =>
    apiRequest("/admin-panel/announcements/active/"),
  dismissAnnouncement: (id) =>
    apiRequest(`/admin-panel/announcements/${id}/dismiss/`, { method: "POST" }),

  // Applications
  listApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(
      `/admin-panel/applications/${queryString ? "?" + queryString : ""}`,
    );
  },
  overrideApplicationStatus: (id, new_status, note = "") =>
    apiRequest(`/admin-panel/applications/${id}/override/`, {
      method: "POST",
      body: { new_status, note: note || undefined },
    }),
};

export default {
  auth: authAPI,
  profiles: profilesAPI,
  research: researchAPI,
  reference: referenceAPI,
  messages: messagesAPI,
  admin: adminAPI,
};
