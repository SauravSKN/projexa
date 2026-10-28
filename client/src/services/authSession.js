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
 * In the meantime, this module provides an isolated, dev-only consumer contract
 * that allows building and verifying Member 2's Admin and Guide portals without
 * blocking on Member 1's deliverable or creating a competing provider.
 *
 * SECURITY NOTICE:
 * — Development persona fallback is strictly guarded by `import.meta.env.DEV`.
 * — In production builds, development personas and headers are completely disabled.
 * — Mock mode is never active in production; it requires explicit local enablement.
 * — User-supplied role headers are never trusted as proof of authentication
 *   outside of explicitly enabled development mode.
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

const DEV_SESSION_KEY = 'projexa_dev_session_role';
const MOCK_MODE_INDICATOR = 'projexa_mock_mode';

/**
 * Returns the currently active development role (defaulting to 'admin' in DEV mode).
 * Only returns a value when explicitly in development environment.
 */
export function getActiveDevRole() {
  if (!import.meta.env.DEV) return null;
  try {
    return sessionStorage.getItem(DEV_SESSION_KEY) || 'admin';
  } catch {
    return 'admin';
  }
}

/**
 * Switch the active development persona (for manual testing of role-based route guards).
 * Disabled in non-development environments. Dispatches auth change event so
 * all components re-render synchronously when the role switches.
 */
export function setDevSessionRole(role) {
  if (!import.meta.env.DEV) return;
  if (!role) {
    sessionStorage.removeItem(DEV_SESSION_KEY);
  } else {
    sessionStorage.setItem(DEV_SESSION_KEY, role);
  }
  window.dispatchEvent(new Event('projexa_auth_change'));
}

/**
 * Returns whether the application is operating in mock/development mode.
 * This is explicitly controlled by the presence of `import.meta.env.DEV`.
 * When true, dev personas and storage-based mock data are enabled.
 * When false, all API calls target production endpoints with real session tokens.
 */
export function isMockMode() {
  return Boolean(import.meta.env.DEV);
}

/**
 * Helper to construct authentication headers for API requests.
 * In development, includes the active dev persona role and ID for backend validation.
 * In production, returns standard headers without any dev persona metadata,
 * ensuring production cannot activate development impersonation.
 */
export function getAuthHeaders() {
  const isDev = Boolean(import.meta.env.DEV);
  const activeRole = isDev ? getActiveDevRole() : null;
  const user = isDev && activeRole ? DEV_PERSONAS[activeRole] : null;

  if (isDev && user) {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-projexa-role': user.role,
      'x-projexa-user-id': user.id,
      'x-projexa-user-name': user.fullName,
      [MOCK_MODE_INDICATOR]: 'true',
    };
  }

  // Production: no dev persona headers, no mock mode indicator
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}

/**
 * Primary consumer hook for Member 2 screens.
 * Exposes authenticated session info, role, and dev helpers.
 * Clearly indicates when the application is operating with mock data.
 */
export function useAuthSession() {
  const isDev = Boolean(import.meta.env.DEV);

  const [activeRole, setActiveRole] = useState(() => (isDev ? getActiveDevRole() : null));

  useEffect(() => {
    const handleAuthChange = () => {
      setActiveRole(isDev ? getActiveDevRole() : null);
    };
    window.addEventListener('projexa_auth_change', handleAuthChange);
    return () => window.removeEventListener('projexa_auth_change', handleAuthChange);
  }, [isDev]);

  const user = isDev && activeRole ? DEV_PERSONAS[activeRole] || null : null;
  const role = user?.role || null;
  const isAuthenticated = Boolean(user);

  // Explicit mock mode status - only true when in DEV environment
  const mockMode = isDev;

  const switchDevRole = useCallback((newRole) => {
    setDevSessionRole(newRole);
  }, []);

  const logout = useCallback(() => {
    if (isDev) {
      setDevSessionRole(null);
    }
  }, [isDev]);

  return {
    user,
    role,
    isAuthenticated,
    isDevMode: isDev,
    mockMode,
    switchDevRole,
    logout,
    availablePersonas: isDev ? DEV_PERSONAS : {},
    mockModeIndicator: isDev ? MOCK_MODE_INDICATOR : undefined,
  };
}
