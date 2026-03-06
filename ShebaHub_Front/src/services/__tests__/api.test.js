/**
 * Tests for authAPI in src/services/api.js
 *
 * Bug 1 regression (frontend): `.catch(() => ({}))` on JSON parse ensures
 * non-JSON error responses do not crash the signup/login flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock import.meta.env before importing api.js
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/api');

// Dynamic import after env stub
const { authAPI } = await import('../../services/api.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: () => { store = {}; },
  };
})();

function jsonResponse(body, statusCode = 200) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

function nonJsonResponse(statusCode) {
  return new Response('Internal Server Error', {
    status: statusCode,
    headers: { 'Content-Type': 'text/html' },
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockLocalStorage.clear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });
  vi.spyOn(window, 'dispatchEvent').mockImplementation(() => {});
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// authAPI.signup
// ---------------------------------------------------------------------------

describe('authAPI.signup', () => {
  const userData = {
    email: 'test@example.com',
    password: 'StrongPass123!',
    confirmPassword: 'StrongPass123!',
    firstName: 'Test',
    lastName: 'User',
  };

  it('returns parsed JSON on success (201)', async () => {
    const body = {
      tokens: { access: 'acc', refresh: 'ref' },
      user: { id: '1', email: 'test@example.com', has_student_profile: false, has_mentor_profile: false },
    };
    global.fetch.mockResolvedValueOnce(jsonResponse(body, 201));

    const result = await authAPI.signup(userData);
    expect(result).toEqual(body);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'acc');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'ref');
  });

  it('throws with parsed data on JSON error (400)', async () => {
    const errorBody = { email: ['A user with this email already exists.'] };
    global.fetch.mockResolvedValueOnce(jsonResponse(errorBody, 400));

    await expect(authAPI.signup(userData)).rejects.toEqual(
      expect.objectContaining({ status: 400, data: errorBody }),
    );
  });

  it('handles non-JSON response gracefully (Bug 1 regression)', async () => {
    global.fetch.mockResolvedValueOnce(nonJsonResponse(500));

    await expect(authAPI.signup(userData)).rejects.toEqual(
      expect.objectContaining({ status: 500, data: {} }),
    );
  });

  it('does not set tokens when response not ok', async () => {
    const errorBody = { detail: 'error' };
    global.fetch.mockResolvedValueOnce(jsonResponse(errorBody, 400));

    await expect(authAPI.signup(userData)).rejects.toBeDefined();
    expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith('accessToken', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// authAPI.login
// ---------------------------------------------------------------------------

describe('authAPI.login', () => {
  const creds = { email: 'test@example.com', password: 'pass123' };

  it('returns parsed JSON and stores tokens on success', async () => {
    const body = {
      tokens: { access: 'acc', refresh: 'ref' },
      user: { id: '1', email: 'test@example.com' },
    };
    global.fetch.mockResolvedValueOnce(jsonResponse(body, 200));

    const result = await authAPI.login(creds);
    expect(result).toEqual(body);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('accessToken', 'acc');
  });

  it('throws with parsed data on 401', async () => {
    const errorBody = { detail: 'Invalid credentials.' };
    global.fetch.mockResolvedValueOnce(jsonResponse(errorBody, 401));

    await expect(authAPI.login(creds)).rejects.toEqual(
      expect.objectContaining({ status: 401, data: errorBody }),
    );
  });

  it('handles non-JSON response gracefully (Bug 1 regression)', async () => {
    global.fetch.mockResolvedValueOnce(nonJsonResponse(502));

    await expect(authAPI.login(creds)).rejects.toEqual(
      expect.objectContaining({ status: 502, data: {} }),
    );
  });
});

// ---------------------------------------------------------------------------
// authAPI.isAuthenticated
// ---------------------------------------------------------------------------

describe('authAPI.isAuthenticated', () => {
  it('returns false when no token stored', () => {
    expect(authAPI.isAuthenticated()).toBe(false);
  });

  it('returns false when token is expired', () => {
    // Build a JWT with exp in the past
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 }));
    const token = `${header}.${payload}.sig`;
    mockLocalStorage.getItem.mockImplementation((key) => key === 'accessToken' ? token : null);

    expect(authAPI.isAuthenticated()).toBe(false);
  });

  it('returns true when token is valid', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const token = `${header}.${payload}.sig`;
    mockLocalStorage.getItem.mockImplementation((key) => key === 'accessToken' ? token : null);

    expect(authAPI.isAuthenticated()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// authAPI.logout
// ---------------------------------------------------------------------------

describe('authAPI.logout', () => {
  it('clears tokens and dispatches auth:logout event', async () => {
    // Provide a refresh token so the server call is attempted
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'refreshToken') return 'refresh-tok';
      if (key === 'accessToken') return 'access-tok';
      return null;
    });
    global.fetch.mockResolvedValueOnce(jsonResponse({ detail: 'Logged out.' }));

    await authAPI.logout();

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('accessToken');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});
