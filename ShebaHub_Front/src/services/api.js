// API Service for Backend Communication
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// ---------------- Token helpers ----------------
const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
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
  return (payload.exp * 1000) > (Date.now() + skewMs);
};

// Token management
const getAccessToken = () => localStorage.getItem('accessToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');
const setTokens = (access, refresh) => {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  // Notify React context(s) that auth has been cleared
  window.dispatchEvent(new Event('auth:logout'));
};

// Create headers with authentication
const getHeaders = (includeAuth = true, isFormData = false) => {
  const headers = {};
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (includeAuth) {
    const token = getAccessToken();
    if (token && isAccessTokenValid(token)) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};

// Handle API response
const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw { status: response.status, data };
  }
  
  return data;
};

// Refresh access token using refresh token
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('accessToken', data.access);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// API request wrapper (auto-retries once after refresh on 401)
const apiRequest = async (endpoint, options = {}) => {
  const { method = 'GET', body, auth = true, isFormData = false } = options;
  
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
      window.location.href = '/login';
    }
  }

  return handleResponse(response);
};

// ============== AUTH API ==============

export const authAPI = {
  // Register new user
  signup: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw { status: response.status, data };
    }
    
    // Save tokens and user data
    if (data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw { status: response.status, data };
    }
    
    // Save tokens and user data
    if (data.tokens) {
      setTokens(data.tokens.access, data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },
  
  // Logout user
  logout: () => {
    clearTokens();
  },
  
  // Get current user from localStorage
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = getAccessToken();
    return isAccessTokenValid(token);
  },
};

// ============== PROFILES API ==============

export const profilesAPI = {
  // Get mentor profile of current user
  getMyMentorProfile: () => apiRequest('/profiles/mentor/me/'),
  
  // Create mentor profile
  createMentorProfile: (profileData) => apiRequest('/profiles/mentor/me/', {
    method: 'POST',
    body: profileData,
  }),
  
  // Update mentor profile (partial update)
  updateMentorProfile: (profileData) => apiRequest('/profiles/mentor/me/', {
    method: 'PATCH',
    body: profileData,
  }),
  
  // Get student profile of current user
  getMyStudentProfile: () => apiRequest('/profiles/student/me/'),
  
  // Create student profile
  createStudentProfile: (profileData) => apiRequest('/profiles/student/me/', {
    method: 'POST',
    body: profileData,
  }),
  
  // Update student profile (partial update)
  updateStudentProfile: (profileData) => apiRequest('/profiles/student/me/', {
    method: 'PATCH',
    body: profileData,
  }),

  // Upload avatar image
  uploadAvatar: async (file, profileType = 'mentor') => {
    const formData = new FormData();
    formData.append('avatar', file);
    const endpoint = profileType === 'mentor' ? '/profiles/mentor/me/avatar/' : '/profiles/student/me/avatar/';
    return apiRequest(endpoint, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  // Delete avatar
  deleteAvatar: (profileType = 'mentor') => {
    const endpoint = profileType === 'mentor' ? '/profiles/mentor/me/avatar/' : '/profiles/student/me/avatar/';
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // Upload document
  uploadDocument: async (file, profileType = 'mentor', documentType = 'OTHER', description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('description', description);
    const endpoint = profileType === 'mentor' ? '/profiles/mentor/me/documents/' : '/profiles/student/me/documents/';
    return apiRequest(endpoint, {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  // Delete document
  deleteDocument: (documentId, profileType = 'mentor') => {
    const endpoint = profileType === 'mentor'
      ? `/profiles/mentor/me/documents/${documentId}/`
      : `/profiles/student/me/documents/${documentId}/`;
    return apiRequest(endpoint, { method: 'DELETE' });
  },

  // List all mentors (public)
  listMentors: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/profiles/mentors/${queryString ? '?' + queryString : ''}`, { auth: false });
  },
  
  // Get specific mentor by ID (public)
  getMentor: (id) => apiRequest(`/profiles/mentors/${id}/`, { auth: false }),
  
  // List all students (public)
  listStudents: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/profiles/students/${queryString ? '?' + queryString : ''}`, { auth: false });
  },
  
  // Get specific student by ID (public)
  getStudent: (id) => apiRequest(`/profiles/students/${id}/`, { auth: false }),
};

// ============== RESEARCH API ==============

const buildResearchFormData = (data, options = {}) => {
  const { removeContract = false } = options;
  const formData = new FormData();

  const appendIfPresent = (key, value) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    formData.append(key, value);
  };

  appendIfPresent('researchName', data.researchName);
  appendIfPresent('description', data.description);
  appendIfPresent('researchArea', data.researchArea);
  appendIfPresent('mentors', data.mentors);
  appendIfPresent('teamSize', data.teamSize);
  appendIfPresent('startDate', data.startDate);
  appendIfPresent('weeklyHours', data.weeklyHours);
  appendIfPresent('durationWeeks', data.durationWeeks);
  appendIfPresent('compensation', data.compensation);
  appendIfPresent('workMode', data.workMode);
  appendIfPresent('requirements', data.requirements);
  appendIfPresent('skillsAndTools', data.skillsAndTools);
  appendIfPresent('output', data.output);
  appendIfPresent('location', data.location);
  appendIfPresent('status', data.status);
  appendIfPresent('helsinkiApproval', data.helsinkiApproval);
  appendIfPresent('dataType', data.dataType);
  if (data.contract instanceof File) {
    appendIfPresent('contract', data.contract);
  }

  if (removeContract) {
    formData.append('remove_contract', '1');
  }

  return formData;
};

export const researchAPI = {
  // Public read (students can view)
  listResearches: () => apiRequest('/research/', { auth: false }),
  getResearch: (id) => apiRequest(`/research/${id}/`, { auth: false }),

  // Mentor-only: manage own researches
  listMyResearches: () => apiRequest('/research/me/'),
  getMyResearch: (id) => apiRequest(`/research/me/${id}/`),
  createMyResearch: (data) => {
    const formData = buildResearchFormData(data);
    return apiRequest('/research/me/', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },

  updateMyResearch: (id, data, options = {}) => {
    const formData = buildResearchFormData(data, options);
    return apiRequest(`/research/me/${id}/`, {
      method: 'PATCH',
      body: formData,
      isFormData: true,
    });
  },

  deleteMyResearch: (id) => apiRequest(`/research/me/${id}/`, { method: 'DELETE' }),
};

// ============== REFERENCE DATA API ==============

export const referenceAPI = {
  // Get all reference data
  getAll: () => apiRequest('/reference-data/', { auth: false }),
  
  // Get specific reference data
  getSpecialties: () => apiRequest('/reference-data/specialties/', { auth: false }),
  getInstitutions: () => apiRequest('/reference-data/institutions/', { auth: false }),
  getDegrees: () => apiRequest('/reference-data/degrees/', { auth: false }),
  getAcademicRanks: () => apiRequest('/reference-data/academic-ranks/', { auth: false }),
  getResearchInterests: () => apiRequest('/reference-data/research-interests/', { auth: false }),
  getMedicalTrainingStages: () => apiRequest('/reference-data/medical-training-stages/', { auth: false }),
  getWorkTypes: () => apiRequest('/reference-data/work-types/', { auth: false }),
  getCompensationPreferences: () => apiRequest('/reference-data/compensation-preferences/', { auth: false }),
  getParticipationModes: () => apiRequest('/reference-data/participation-modes/', { auth: false }),
  getProfessionalExperience: () => apiRequest('/reference-data/professional-experience/', { auth: false }),
};

export default {
  auth: authAPI,
  profiles: profilesAPI,
  research: researchAPI,
  reference: referenceAPI,
};
