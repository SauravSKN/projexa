import { useState, useEffect, useCallback } from 'react';

/**
 * PROJEXA — Authentication Coordination Adapter
 *
 * OWNER NOTE:
 * Member 1 (Frontend A) owns authentication screens and production AuthContext.
 * Member 2 (Frontend B) is strictly a consumer of session state.
 * This adapter forwards to Member 1's implementation once available.
 *
 * INTEGRATION SPECIFICATION:
 * Once Member 1 publishes their AuthContext/useAuth hook, this adapter will
 * forward directly to Member 1's useAuth() implementation:
 *
 *   import { useAuth as useMember1Auth } from '../context/AuthContext';
 *   export const useAuthSession = useMember1Auth;
 *
 * In the meantime, this module provides an isolated consumer contract that defaults
 * to an unauthenticated session unless development demo mode is explicitly opted in.
 *
 * SECURITY ENFORCEMENT:
 * — Production builds statically eliminate development impersonation and demo mode.
 * — Automatic admin login in development is removed; sessions default to unauthenticated.
 * — Demo mode requires explicit opt-in via VITE_DEMO_MODE=true or session toggle.
 * — Mock role headers ('x-projexa-role', etc.) are NEVER sent in real API mode or production.
 */

export const DEV_PERSONAS = Object.freeze({
  admin: {
    id: '690100000000000000000001',
    fullName: 'Demo Department Administrator',
    email: 'admin@demo.projexa.invalid',
    role: 'admin',
    department: 'Computer Science & Engineering',
    status: 'active',
    mock: true,
  },
  guide: {
    id: '690100000000000000000011',
    fullName: 'Dr Ananya Shah',
    email: 'guide.a@demo.projexa.invalid',
    role: 'guide',
    department: 'Computer Science & Engineering',
    status: 'active',
    mock: true,
  },
  student: {
    id: '690100000000000000000021',
    fullName: 'Aarav Patel',
    email: 'student.a@demo.projexa.invalid',
    role: 'student',
    department: 'Computer Science & Engineering',
    status: 'active',
    mock: true,
  },
});

export const DEV_SESSION_KEY = 'projexa_dev_session_role';
export const DEMO_MODE_KEY = 'projexa_demo_mode';
export const MOCK_MODE_INDICATOR = 'projexa_mock_mode';

/**
 * Checks whether demo mode is explicitly enabled.
 * HARD RULE: Production builds can NEVER enable demo mode or development impersonation.
 * In development, requires explicit opt-in via VITE_DEMO_MODE=true or sessionStorage.
 */
export function isDemoModeEnabled() {
  if (!import.meta.env.DEV) return false;
  try {
    if (import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_ENABLE_DEMO_MODE === 'true') {
      return true;
    }
    return sessionStorage.getItem(DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Alias for isDemoModeEnabled for backwards compatibility.
 */
export function isMockMode() {
  return Boolean(import.meta.env.DEV) && isDemoModeEnabled();
}

/**
 * Returns the currently active development role if demo mode is enabled.
 * Defaults to null (unauthenticated). Never automatically logs in as admin.
 */
export function getActiveDevRole() {
  if (!import.meta.env.DEV || !isDemoModeEnabled()) return null;
  try {
    const stored = sessionStorage.getItem(DEV_SESSION_KEY);
    return stored && DEV_PERSONAS[stored] ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Switch the active development persona.
 * Hard-disabled in production. Explicitly enables demo session when a role is selected.
 */
export function setDevSessionRole(role) {
  if (!import.meta.env.DEV) return;
  try {
    if (!role) {
      sessionStorage.removeItem(DEV_SESSION_KEY);
    } else {
      sessionStorage.setItem(DEMO_MODE_KEY, 'true');
      sessionStorage.setItem(DEV_SESSION_KEY, role);
    }
  } catch {
    // Ignore storage quota/access errors in restricted environments
  }
  window.dispatchEvent(new Event('projexa_auth_change'));
}

/**
 * Explicitly toggle demo mode on or off in development.
 * Hard-disabled in production.
 */
export function setDemoMode(enabled) {
  if (!import.meta.env.DEV) return;
  try {
    if (enabled) {
      sessionStorage.setItem(DEMO_MODE_KEY, 'true');
    } else {
      sessionStorage.removeItem(DEMO_MODE_KEY);
      sessionStorage.removeItem(DEV_SESSION_KEY);
    }
  } catch {
    // Ignore
  }
  window.dispatchEvent(new Event('projexa_auth_change'));
}

/**
 * Helper to construct authentication headers for API requests.
 * In real API mode or in production, returns ONLY standard JSON headers.
 * Mock role headers are NEVER sent in real API mode or in production builds.
 * Only in explicitly opted-in development demo mode are mock role headers appended.
 */
export function getAuthHeaders() {
  // Production builds or real API mode (demo mode disabled):
  // Statically dead-code eliminated in production builds.
  if (!import.meta.env.DEV || !isDemoModeEnabled()) {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  // In development with explicit demo mode opt-in:
  const activeRole = getActiveDevRole();
  const user = activeRole ? DEV_PERSONAS[activeRole] : null;

  if (user) {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-projexa-role': user.role,
      'x-projexa-user-id': user.id,
      'x-projexa-user-name': user.fullName,
      [MOCK_MODE_INDICATOR]: 'true',
    };
  }

  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Primary consumer hook for Member 2 screens.
 * Exposes authenticated session info, role, and dev helpers.
 * Defaults to unauthenticated (user: null, role: null, isAuthenticated: false)
 * when demo mode is not enabled.
 */
export function useAuthSession() {
  const isDev = Boolean(import.meta.env.DEV);

  const [activeRole, setActiveRole] = useState(() => (isDev ? getActiveDevRole() : null));
  const [demoMode, setDemoModeState] = useState(() => (isDev ? isDemoModeEnabled() : false));

  useEffect(() => {
    if (!isDev) return;
    const handleAuthChange = () => {
      setActiveRole(getActiveDevRole());
      setDemoModeState(isDemoModeEnabled());
    };
    window.addEventListener('projexa_auth_change', handleAuthChange);
    return () => window.removeEventListener('projexa_auth_change', handleAuthChange);
  }, [isDev]);

  const user = isDev && demoMode && activeRole ? DEV_PERSONAS[activeRole] || null : null;
  const role = user?.role || null;
  const isAuthenticated = Boolean(user);

  const switchDevRole = useCallback((newRole) => {
    if (isDev) {
      setDevSessionRole(newRole);
    }
  }, [isDev]);

  const logout = useCallback(() => {
    if (isDev) {
      setDevSessionRole(null);
      try {
        sessionStorage.removeItem(DEMO_MODE_KEY);
      } catch {
        // ignore
      }
      window.dispatchEvent(new Event('projexa_auth_change'));
    }
  }, [isDev]);

  const toggleDemoMode = useCallback((enabled) => {
    if (isDev) {
      setDemoMode(enabled);
    }
  }, [isDev]);

  return {
    user,
    role,
    isAuthenticated,
    isDevMode: isDev,
    mockMode: isDev && demoMode,
    demoMode: isDev && demoMode,
    toggleDemoMode,
    switchDevRole,
    logout,
    availablePersonas: isDev && demoMode ? DEV_PERSONAS : {},
    mockModeIndicator: isDev && demoMode ? MOCK_MODE_INDICATOR : undefined,
  };
}
