import React from 'react';
import { Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '../services/authSession';

/**
 * Route protection guard for role-scoped portals.
 *
 * Implements role restrictions:
 * - Shows loading state during active session verification.
 * - Rejects unauthenticated visits.
 * - Enforces role restrictions (Student, Guide, Admin).
 * - Displays a standard accessible 403 Forbidden screen on role mismatch.
 * - In development mode, provides session simulation helpers for QA testing.
 * - In production mode, redirects unauthenticated requests cleanly to /login.
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, role, isAuthenticated, isLoading, isDevMode, mockMode, switchDevRole } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p role="status" className="text-slate-600 font-medium">Checking your session…</p>
      </div>
    );
  }

  // 1. Unauthenticated handling
  if (!isAuthenticated) {
    if (isDevMode) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Authentication Required</h2>
            <p className="text-sm text-slate-600 mb-6">
              You must be logged in with an active session to access this portal.
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Dev Session Simulator
              </p>
              <p className="text-xs text-slate-600 mb-3">
                Select a persona below to simulate an authenticated session, or sign in with real credentials:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    switchDevRole('admin');
                    navigate('/admin');
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition-colors"
                >
                  Simulate Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchDevRole('guide');
                    navigate('/guide');
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors"
                >
                  Simulate Guide
                </button>
              </div>
              <Link
                to="/login"
                className="block text-center px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded text-xs font-medium transition-colors"
              >
                Sign in with Real Credentials
              </Link>
              {mockMode && (
                <p className="text-xs text-slate-500 mt-2">
                  Application running in {'mock'} development mode.
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 2. Role restriction check
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAuthorized) {
    const authorizedHome = role === 'admin' ? '/admin' : role === 'guide' ? '/guide' : '/student';

    const handleRoleSwitch = (targetRole) => {
      switchDevRole(targetRole);
      if (allowedRoles.includes(targetRole)) {
        navigate(location.pathname, { replace: true });
      } else {
        navigate(targetRole === 'admin' ? '/admin' : targetRole === 'guide' ? '/guide' : '/student', {
          replace: true,
        });
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-rose-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            403
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your current account role does not have permission to access this area.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Session Information
            </p>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <span className="font-medium text-slate-700">Account:</span> {user?.fullName || 'User'}
              </p>
              <p>
                <span className="font-medium text-slate-700">Current Role:</span>{' '}
                <span className="capitalize px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-medium">
                  {role || 'None'}
                </span>
              </p>
              <p>
                <span className="font-medium text-slate-700">Required Role:</span>{' '}
                <span className="capitalize px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                  {allowedRoles.join(' or ')}
                </span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              to={authorizedHome}
              className="block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Go to Your Dashboard
            </Link>

            {isDevMode && (
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2 font-medium">Dev Role Switcher (Testing):</p>
                <div className="flex justify-center gap-2">
                  {allowedRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSwitch(r)}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs capitalize transition-colors"
                    >
                      Switch to {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
