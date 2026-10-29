import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext(null);
const root = '/api/v1/auth';

async function result(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const error = new Error(body.error?.message || 'Request failed. Please try again.');
    error.status = response.status;
    throw error;
  }
  return body.data || {};
}

function csrfCookie() {
  if (typeof document === 'undefined') return '';
  const value = document.cookie.split('; ').find((cookie) => cookie.startsWith('projexa_csrf='));
  return value ? decodeURIComponent(value.slice('projexa_csrf='.length)) : '';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${root}/me`, { credentials: 'include' });
      if (response.status === 401 || response.status === 403) {
        setUser(null);
        return null;
      }
      const data = await result(response);
      setUser(data.user || null);
      return data.user || null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async ({ email, password }) => {
    setError('');
    const response = await fetch(`${root}/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await result(response);
    // Session cookie is HTTP-only. Never store the JWT in browser storage.
    setUser(data.user || null);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const csrf = csrfCookie();
    try {
      const response = await fetch(`${root}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
      });
      await result(response);
    } catch (err) {
      setError('Server logout failed. Please retry or close this browser session.');
      throw err;
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role || null,
      isAuthenticated: Boolean(user),
      isLoading: loading,
      error,
      login,
      logout,
      refresh,
    }),
    [user, loading, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return (
    useContext(AuthContext) || {
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {
        throw new Error('AuthProvider not mounted');
      },
      logout: async () => {},
      refresh: async () => null,
    }
  );
}

export default AuthContext;
