import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * PROJEXA — Authentication Coordination Adapter
 *
 * Connects to Member 1's AuthContext while preserving isolated demo personas
 * for development/QA environments.
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

export const isMockMode = isDemoModeEnabled;

export function getActiveDevRole() {
  if (!import.meta.env.DEV || !isDemoModeEnabled()) return null;
  try {
    const stored = sessionStorage.getItem(DEV_SESSION_KEY);
    return stored && DEV_PERSONAS[stored] ? stored : null;
  } catch {
    return null;
  }
}

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
    // Ignore
  }
  window.dispatchEvent(new Event('projexa_auth_change'));
}

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

function csrfCookie() {
  if (typeof document === 'undefined') return null;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith('projexa_csrf='));
  return cookie ? decodeURIComponent(cookie.slice('projexa_csrf='.length)) : null;
}

export function getAuthHeaders() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  // Statically eliminate dev mock branch in production builds
  if (!import.meta.env.DEV || !isDemoModeEnabled()) {
    const token = csrfCookie();
    return token ? { ...headers, 'X-CSRF-Token': token } : headers;
  }

  // Explicit demo mode in development only
  const activeRole = getActiveDevRole();
  const user = activeRole ? DEV_PERSONAS[activeRole] : null;

  if (user) {
    return {
      ...headers,
      'x-projexa-role': user.role,
      'x-projexa-user-id': user.id,
      'x-projexa-user-name': user.fullName,
      [MOCK_MODE_INDICATOR]: 'true',
    };
  }

  return headers;
}

export function useAuthSession() {
  const auth = useAuth();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const update = () => setRevision((v) => v + 1);
    window.addEventListener('projexa_auth_change', update);
    return () => window.removeEventListener('projexa_auth_change', update);
  }, []);

  const mock = isMockMode();
  const devRole = mock && revision >= 0 ? getActiveDevRole() : null;
  const user = mock ? (devRole ? DEV_PERSONAS[devRole] : null) : auth.user;
  const role = user?.role || null;
  const isAuthenticated = Boolean(user);
  const isLoading = mock ? false : auth.isLoading;

  const switchDevRole = useCallback((newRole) => {
    setDevSessionRole(newRole);
  }, []);

  const logout = useCallback(async () => {
    if (mock) {
      setDemoMode(false);
      return;
    }
    return auth.logout();
  }, [auth.logout, mock]);

  const toggleDemoMode = useCallback((enabled) => {
    setDemoMode(enabled);
  }, []);

  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    isDevMode: Boolean(import.meta.env.DEV),
    mockMode: mock,
    demoMode: mock,
    toggleDemoMode,
    switchDevRole,
    logout,
    availablePersonas: mock ? DEV_PERSONAS : {},
    mockModeIndicator: mock ? MOCK_MODE_INDICATOR : undefined,
  };
}

export default useAuthSession;
