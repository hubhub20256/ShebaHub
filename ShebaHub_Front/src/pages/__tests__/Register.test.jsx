/**
 * Tests for Register page.
 *
 * Bug 3 regression: welcome text must be gender-inclusive "ברוכ/ה הבא/ה".
 * Also covers form validation, signup success, and error handling.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from '../Register';

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

const mockSignup = vi.fn();
vi.mock('../../services/api', () => ({
  authAPI: {
    signup: (...args) => mockSignup(...args),
  },
}));

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Bug 3 regression – welcome text
// ---------------------------------------------------------------------------

describe('Bug 3 regression – welcome text', () => {
  it('displays gender-inclusive welcome text "ברוכ/ה הבא/ה"', () => {
    renderRegister();
    expect(screen.getByText('ברוכ/ה הבא/ה')).toBeDefined();
  });

  it('does NOT display old text "ברוכה הבאה"', () => {
    renderRegister();
    expect(screen.queryByText('ברוכה הבאה')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

describe('Page structure', () => {
  it('renders all form fields', () => {
    renderRegister();
    expect(screen.getByPlaceholderText('שם פרטי')).toBeDefined();
    expect(screen.getByPlaceholderText('שם משפחה')).toBeDefined();
    expect(screen.getByPlaceholderText('דואר אלקטרוני')).toBeDefined();
    expect(screen.getByPlaceholderText('אימות דואר אלקטרוני')).toBeDefined();
    expect(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)')).toBeDefined();
    expect(screen.getByPlaceholderText('אימות סיסמה')).toBeDefined();
  });

  it('renders submit button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: 'הרשמה' })).toBeDefined();
  });

  it('renders login link', () => {
    renderRegister();
    expect(screen.getByText('להתחברות')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Client-side validation
// ---------------------------------------------------------------------------

describe('Client-side validation', () => {
  it('shows error for empty firstName', async () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('שם פרטי הוא שדה חובה')).toBeDefined();
    });
  });

  it('shows error for invalid email', async () => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { name: 'firstName', value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { name: 'lastName', value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), { target: { name: 'email', value: 'bad' } });
    fireEvent.change(screen.getByPlaceholderText('אימות דואר אלקטרוני'), { target: { name: 'confirmEmail', value: 'bad' } });
    fireEvent.change(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)'), { target: { name: 'password', value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('אימות סיסמה'), { target: { name: 'confirmPassword', value: '12345678' } });
    // Use fireEvent.submit to bypass browser HTML5 validation on type="email" input
    fireEvent.submit(screen.getByRole('button', { name: 'הרשמה' }).closest('form'));
    await waitFor(() => {
      expect(screen.getByText('נא להזין כתובת אימייל תקינה')).toBeDefined();
    });
  });

  it('shows error for password mismatch', async () => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { name: 'firstName', value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { name: 'lastName', value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('אימות דואר אלקטרוני'), { target: { name: 'confirmEmail', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)'), { target: { name: 'password', value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('אימות סיסמה'), { target: { name: 'confirmPassword', value: 'different' } });
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('הסיסמאות אינן תואמות')).toBeDefined();
    });
  });

  it('shows error for short password', async () => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { name: 'firstName', value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { name: 'lastName', value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('אימות דואר אלקטרוני'), { target: { name: 'confirmEmail', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)'), { target: { name: 'password', value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('אימות סיסמה'), { target: { name: 'confirmPassword', value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('הסיסמה חייבת להכיל לפחות 8 תווים')).toBeDefined();
    });
  });

  it('shows error for unchecked terms', async () => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { name: 'firstName', value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { name: 'lastName', value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('אימות דואר אלקטרוני'), { target: { name: 'confirmEmail', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)'), { target: { name: 'password', value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('אימות סיסמה'), { target: { name: 'confirmPassword', value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('חובה לאשר את תנאי השימוש')).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Signup success
// ---------------------------------------------------------------------------

describe('Signup success', () => {
  function fillValidForm() {
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { name: 'firstName', value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { name: 'lastName', value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('אימות דואר אלקטרוני'), { target: { name: 'confirmEmail', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)'), { target: { name: 'password', value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('אימות סיסמה'), { target: { name: 'confirmPassword', value: '12345678' } });
    // Check terms checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
  }

  it('shows registration complete message when unverified', async () => {
    mockSignup.mockResolvedValueOnce({
      tokens: { access: 'a', refresh: 'r' },
      user: { id: '1', email_verified: false },
    });
    renderRegister();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('הרשמה הושלמה')).toBeDefined();
    });
  });

  it('navigates to /create-profile when verified', async () => {
    mockSignup.mockResolvedValueOnce({
      tokens: { access: 'a', refresh: 'r' },
      user: { id: '1', email_verified: true },
    });
    renderRegister();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/create-profile');
    });
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Error handling', () => {
  function fillValidForm() {
    fireEvent.change(screen.getByPlaceholderText('שם פרטי'), { target: { name: 'firstName', value: 'A' } });
    fireEvent.change(screen.getByPlaceholderText('שם משפחה'), { target: { name: 'lastName', value: 'B' } });
    fireEvent.change(screen.getByPlaceholderText('דואר אלקטרוני'), { target: { name: 'email', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('אימות דואר אלקטרוני'), { target: { name: 'confirmEmail', value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('סיסמה (לפחות 8 תווים)'), { target: { name: 'password', value: '12345678' } });
    fireEvent.change(screen.getByPlaceholderText('אימות סיסמה'), { target: { name: 'confirmPassword', value: '12345678' } });
    fireEvent.click(screen.getByRole('checkbox'));
  }

  it('shows duplicate email field error', async () => {
    mockSignup.mockRejectedValueOnce({
      status: 409,
      data: {
        code: 'CONFLICT',
        message: 'A user with this email already exists.',
        details: { email: ['A user with this email already exists.'] },
      },
    });
    renderRegister();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('משתמש עם כתובת אימייל זו כבר קיים')).toBeDefined();
    });
  });

  it('shows generic communication error when no .data', async () => {
    mockSignup.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderRegister();
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'הרשמה' }));
    await waitFor(() => {
      expect(screen.getByText('אירעה שגיאה בתקשורת, נסה שנית מאוחר יותר')).toBeDefined();
    });
  });
});
