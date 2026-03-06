import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';
import RequireProfile from '../RequireProfile';

const renderWithRouter = (ui) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('RequireProfile', () => {
  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null, loading: false });
    renderWithRouter(
      <RequireProfile><div>Protected</div></RequireProfile>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('redirects to /create-profile when authenticated but no profile', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { has_student_profile: false, has_mentor_profile: false },
      loading: false,
    });
    renderWithRouter(
      <RequireProfile><div>Protected</div></RequireProfile>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with student profile', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { has_student_profile: true, has_mentor_profile: false },
      loading: false,
    });
    renderWithRouter(
      <RequireProfile><div>Protected</div></RequireProfile>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('renders children when authenticated with mentor profile', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { has_student_profile: false, has_mentor_profile: true },
      loading: false,
    });
    renderWithRouter(
      <RequireProfile><div>Protected</div></RequireProfile>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
