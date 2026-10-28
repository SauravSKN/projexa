import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import GuideLayout from '../layouts/GuideLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminTeams from '../pages/admin/Teams';
import AdminProjects from '../pages/admin/Projects';
import GuideDashboard from '../pages/guide/Dashboard';
import AssignedTeams from '../pages/guide/AssignedTeams';
import { useAuthSession } from '../services/authSession';

/**
 * Root Home Redirection / Landing
 * Directs active users to their role-specific dashboard.
 */
function HomeRedirect() {
  const { role, isAuthenticated, isDevMode } = useAuthSession();

  if (isAuthenticated) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'guide') return <Navigate to="/guide" replace />;
  }

  // If in DEV mode without an explicit role, default to admin portal
  if (isDevMode) {
    return <Navigate to="/admin" replace />;
  }

  // Otherwise show a welcome landing
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">PROJEXA</h1>
        <p className="text-sm text-slate-600 mb-6">Academic Project Management Platform</p>
        <div className="space-y-3">
          <Link
            to="/admin"
            className="block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
          >
            Go to Admin Portal
          </Link>
          <Link
            to="/guide"
            className="block w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
          >
            Go to Guide Portal
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * 404 Not Found Page
 */
function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="text-4xl font-extrabold text-slate-300 mb-2">404</div>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Page Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">
          The requested route does not exist in PROJEXA.
        </p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}

/**
 * Primary Application Routes (Member 2 — Frontend B)
 *
 * Configures role-scoped routing for Faculty Guide and Administrator portals.
 * Uses ProtectedRoute to enforce role authorization (FE2-07).
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Root Landing / Redirect */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Admin Portal (Protected, requires role: 'admin') */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/projects" element={<AdminProjects />} />
        </Route>
      </Route>

      {/* Guide Portal (Protected, requires role: 'guide') */}
      <Route element={<ProtectedRoute allowedRoles={['guide']} />}>
        <Route element={<GuideLayout />}>
          <Route path="/guide" element={<GuideDashboard />} />
          <Route path="/guide/teams" element={<AssignedTeams />} />
        </Route>
      </Route>

      {/* Central 404 Handler */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
