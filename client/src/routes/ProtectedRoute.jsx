import React from 'react';
import { Navigate, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '../services/authSession';

/**
 * Route protection guard for role-scoped portals.
 *
 * Implements role restrictions:
 * - Rejects unauthenticated visits.
 * - Enforces role restrictions (e.g., Guide cannot load Admin routes and vice-versa).
 * - Displays a standard accessible 403 Forbidden screen on role mismatch without
 *   leaking protected metadata.
 * - In development mode, provides role switching for QA testing that re-evaluates
 *   access and navigates cleanly without getting stuck on forbidden URLs.
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, role, isAuthenticated, isDevMode, mockMode, switchDevRole } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();

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
                Member 1 owns production login. Select a persona below to simulate an authenticated session:
              </p>
              <div className="grid grid-cols-2 gap-2">
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
    return <Navigate to="/" replace />;
  }

  // 2. Role restriction check
  // If allowedRoles is empty, access is permitted (used as fallback).
  // Otherwise, the user's role must be included in the allowedRoles array.
  const isAuthorized = allowedRoles.length === 0 || allowedRoles.includes(role);

  if (!isAuthorized) {
    const authorizedHome = role === 'admin' ? '/admin' : role === 'guide' ? '/guide' : '/';

    const handleRoleSwitch = (targetRole) => {
      switchDevRole(targetRole);
      // If the current route is allowed for the target role, stay on it;
      // otherwise navigate to the target role's home dashboard
      if (allowedRoles.includes(targetRole)) {
        navigate(location.pathname, { replace: true });
      } else {
        navigate(targetRole === 'admin' ? '/admin' : '/guide', { replace: true });
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-rose-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            403
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your authenticated role <strong className="text-slate-800 capitalize">{role}</strong> does not have permission to access this area.
          </p>
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200 mb-6">
            Required role: <span className="font-mono text-slate-700 font-semibold">{allowedRoles.join(' or ')}</span>
          </div>
          <div className="space-y-2">
            <Link
              to={authorizedHome}
              className="inline-block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Your Dashboard ({role === 'admin' ? 'Admin' : 'Guide'})
            </Link>
            {isDevMode && (
              <div className="pt-4 border-t border-slate-100 text-xs">
                <p className="text-slate-400 mb-2">Dev QA testing — switch role:</p>
                <div className="flex justify-center gap-2">
                  {allowedRoles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRoleSwitch(r)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold transition-colors"
                    >
                      Switch to {r} & View Page
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

  // 3. Authorized access — render the route outlet
  return <Outlet />;
}