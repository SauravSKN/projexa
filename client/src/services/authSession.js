import { useState, useEffect, useCallback } from 'react';

/**
 * PROJEXA Member 2 — Authentication Coordination Adapter
 *
 * OWNER NOTE:
 * Member 1 (Frontend A) owns authentication screens and production AuthContext.
 * Member 2 (Frontend B) is strictly a consumer of session state.
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
 * Development persona fallback is strictly guarded by `import.meta.env.DEV`.
 * In production builds, development personas and headers are disabled.
 */

export const DEV_PERSONAS = Object.freeze({
  admin: {
    id: '690100000000000000000001',
    fullName: 'Demo Department Administrator',
    email: 'admin@demo.projexa.invalid',
    role: 'admin',
    department: 'Computer Science & Engineering',
    status: 'active',
  },
  guide: {
    id: '690100000000000000000011',
    fullName: 'Dr Ananya Shah',
    email: 'guide.a@demo.projexa.invalid',
    role: 'guide',
    department: 'Computer Science & Engineering',
    status: 'active',
  },
});

const DEV_SESSION_KEY = 'projexa_dev_session_role';

/**
 * Returns the currently active development role (defaulting to 'admin' in DEV mode).
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
 * Disabled in non-development environments.
 */
export function setDevSessionRole(role) {
  if (!import.meta.env.DEV) return;
  if (!role) {
    sessionStorage.removeItem(DEV_SESSION_KEY);
  } else {
    sessionStorage.setItem(DEV_SESSION_KEY, role);
  }
  // Dispatch storage event so all components re-render synchronously
  window.dispatchEvent(new Event('projexa_auth_change'));
}

/**
 * Helper to construct authentication headers for API requests.
 * In development, includes the active dev persona role and ID for backend validation.
 * In production, returns standard headers awaiting Member 1 session tokens.
 */
export function getAuthHeaders() {
  const isDev = Boolean(import.meta.env.DEV);
  const activeRole = isDev ? getActiveDevRole() : null;
  const user = isDev && activeRole ? DEV_PERSONAS[activeRole] : null;

  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(isDev && user ? {
      'x-projexa-role': user.role,
      'x-projexa-user-id': user.id,
      'x-projexa-user-name': user.fullName,
    } : {}),
  };
}

/**
 * Primary consumer hook for Member 2 screens.
 * Exposes authenticated session info, role, and dev helpers.
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
    switchDevRole,
    logout,
    availablePersonas: isDev ? DEV_PERSONAS : {},
  };
}
