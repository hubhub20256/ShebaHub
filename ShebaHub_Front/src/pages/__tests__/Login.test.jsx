/**
 * Tests for Login page.
 *
 * Covers page structure, validation, success flows, error handling,
 * and loading state.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('../../hooks/usePageTitle', () => ({
  default: vi.fn(),
}));

vi.mock('../../utils/formValidation', () => ({
  scrollToFirstError: vi.fn(),
}));

const mockLoginApi = vi.fn();
vi.mock('../../services/api', () => ({
  authAPI: {
    login: (...args) => mockLoginApi(...args),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe('Page structure', () => {
  it('renders email field', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('דואר אלקטרוני')).toBeDefined();
  });

  it('renders password field', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('סיסמה')).toBeDefined();
  });

  it('renders submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'כניסה' })).toBeDefined();
  });

  it('renders register link', () => {
    renderLogin();
    expect(screen.getByText('הרשמה')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('Validation', () => {
  it('shows error for empty email', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(screen.getByText('נא להזין כתובת אימייל')).toBeDefined();
    });
  });

  it('shows error for empty password', async () => {
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), {
      target: { name: 'email', value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(screen.getByText('נא להזין סיסמה')).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Login success
// ---------------------------------------------------------------------------

describe('Login success', () => {
  function fillForm(email = 'a@b.com', password = '12345678') {
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), {
      target: { name: 'email', value: email },
    });
    fireEvent.change(screen.getByPlaceholderText('סיסמה'), {
      target: { name: 'password', value: password },
    });
  }

  it('navigates to /create-profile when no profile', async () => {
    mockLoginApi.mockResolvedValueOnce({
      tokens: { access: 'a', refresh: 'r' },
      user: { id: '1', has_student_profile: false, has_mentor_profile: false },
    });
    renderLogin();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/create-profile');
    });
  });

  it('navigates to / when user has student profile', async () => {
    mockLoginApi.mockResolvedValueOnce({
      tokens: { access: 'a', refresh: 'r' },
      user: { id: '1', has_student_profile: true, has_mentor_profile: false },
    });
    renderLogin();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to / when user has mentor profile', async () => {
    mockLoginApi.mockResolvedValueOnce({
      tokens: { access: 'a', refresh: 'r' },
      user: { id: '1', has_student_profile: false, has_mentor_profile: true },
    });
    renderLogin();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  function fillForm() {
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), {
      target: { name: 'email', value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('סיסמה'), {
      target: { name: 'password', value: '12345678' },
    });
  }

  it('shows translated error on invalid credentials (401)', async () => {
    mockLoginApi.mockRejectedValueOnce({
      status: 401,
      data: { detail: 'Invalid credentials.' },
    });
    renderLogin();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(screen.getByText('כתובת האימייל או הסיסמה שגויים')).toBeDefined();
    });
  });

  it('shows network failure message when no .data', async () => {
    mockLoginApi.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderLogin();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(screen.getByText('אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר')).toBeDefined();
    });
  });

  it('shows server error message for generic error with data', async () => {
    mockLoginApi.mockRejectedValueOnce({
      status: 500,
      data: {},
    });
    renderLogin();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));
    await waitFor(() => {
      expect(screen.getByText('כתובת האימייל או הסיסמה שגויים')).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('Loading state', () => {
  it('shows "מתחבר..." while request pending', async () => {
    let resolvePromise;
    mockLoginApi.mockReturnValueOnce(
      new Promise((resolve) => { resolvePromise = resolve; }),
    );
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), {
      target: { name: 'email', value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('סיסמה'), {
      target: { name: 'password', value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'כניסה' }));

    await waitFor(() => {
      expect(screen.getByText('מתחבר...')).toBeDefined();
    });

    // Cleanup: resolve the pending promise
    resolvePromise({
      tokens: { access: 'a', refresh: 'r' },
      user: { id: '1', has_student_profile: false, has_mentor_profile: false },
    });
  });
});
