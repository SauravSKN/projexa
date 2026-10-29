import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/auth/Login';
import StudentDashboard from '../pages/student/Dashboard';
import StudentLayout from '../layouts/StudentLayout';
import * as authSession from '../services/authSession';
import { AuthContext } from '../context/AuthContext';

describe('PROJEXA Member 1 Auth & Student Dashboard Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  test('Login renders sign-in form with email and password inputs', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /sign in to projexa/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('Login validates empty email and password submission', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/please enter email and password/i);
    });
  });

  test('Login calls auth login and navigates upon success', async () => {
    const loginMock = vi.fn().mockResolvedValue({ id: 'u1', role: 'admin', fullName: 'Demo Admin' });
    const user = userEvent.setup();

    render(
      <AuthContext.Provider
        value={{
          user: null,
          role: null,
          isAuthenticated: false,
          isLoading: false,
          login: loginMock,
          logout: vi.fn(),
          refresh: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<div>Admin Landed</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await user.type(screen.getByLabelText(/email address/i), 'admin@demo.projexa.invalid');
    await user.type(screen.getByLabelText(/password/i), 'Secret123456!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'admin@demo.projexa.invalid',
        password: 'Secret123456!',
      });
      expect(screen.getByText('Admin Landed')).toBeInTheDocument();
    });
  });

  test('StudentDashboard renders student welcome and team info when loaded', async () => {
    vi.spyOn(authSession, 'isMockMode').mockReturnValue(false);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          userName: 'Aarav Patel',
          team: { id: 't1', name: 'Alpha Capstone', memberCount: 4 },
          project: { id: 'p1', title: 'Solar IoT Grid', status: 'active' },
          guide: { name: 'Dr Ananya Shah' },
        },
      }),
    });

    render(
      <AuthContext.Provider
        value={{
          user: { id: 's1', fullName: 'Aarav Patel', role: 'student' },
          role: 'student',
          isAuthenticated: true,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          refresh: vi.fn(),
        }}
      >
        <MemoryRouter>
          <StudentDashboard />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome, aarav patel/i)).toBeInTheDocument();
      expect(screen.getByText('Alpha Capstone')).toBeInTheDocument();
      expect(screen.getByText('Solar IoT Grid')).toBeInTheDocument();
      expect(screen.getByText(/guide: dr ananya shah/i)).toBeInTheDocument();
    });
  });

  test('StudentLayout renders header with user name and logout button', () => {
    render(
      <AuthContext.Provider
        value={{
          user: { id: 's1', fullName: 'Aarav Patel', role: 'student' },
          role: 'student',
          isAuthenticated: true,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          refresh: vi.fn(),
        }}
      >
        <MemoryRouter>
          <StudentLayout />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Aarav Patel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});
