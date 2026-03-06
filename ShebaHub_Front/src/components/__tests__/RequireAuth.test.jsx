import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';
import RequireAuth from '../RequireAuth';

const renderWithRouter = (ui) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('RequireAuth', () => {
  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, loading: false });
    renderWithRouter(
      <RequireAuth><div>Protected</div></RequireAuth>
    );
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    renderWithRouter(
      <RequireAuth><div>Protected</div></RequireAuth>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('renders null when loading', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, loading: true });
    const { container } = renderWithRouter(
      <RequireAuth><div>Protected</div></RequireAuth>
    );
    expect(container.innerHTML).toBe('');
  });
});
