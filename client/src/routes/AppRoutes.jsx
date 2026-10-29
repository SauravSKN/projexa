import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import GuideLayout from '../layouts/GuideLayout';
import StudentLayout from '../layouts/StudentLayout';
import AdminDashboard from '../pages/admin/Dashboard';
import AdminTeams from '../pages/admin/Teams';
import AdminProjects from '../pages/admin/Projects';
import GuideDashboard from '../pages/guide/Dashboard';
import AssignedTeams from '../pages/guide/AssignedTeams';
import StudentDashboard from '../pages/student/Dashboard';
import Login from '../pages/auth/Login';
import { useAuthSession } from '../services/authSession';

function HomeRedirect() {
  const { role, isAuthenticated, isLoading } = useAuthSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p role="status" className="text-slate-600 font-medium">Checking session…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'guide') return <Navigate to="/guide" replace />;
    return <Navigate to="/student" replace />;
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="inline-flex rounded-2xl bg-indigo-600 text-white font-black text-2xl px-5 py-3 mb-4">P</div>
        <h1 className="text-3xl font-bold text-slate-900">PROJEXA</h1>
        <p className="mt-3 text-slate-500 text-sm">
          Academic project management platform for students, faculty guides, and administrators.
        </p>
        <div className="mt-7 space-y-3">
          <Link
            to="/login"
            className="block w-full rounded-lg bg-indigo-600 p-3 text-white font-semibold hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </Link>
          <div className="flex justify-center gap-3 text-xs text-slate-500 pt-2">
            <Link to="/student" className="hover:underline">Student</Link>
            <span>•</span>
            <Link to="/guide" className="hover:underline">Faculty</Link>
            <span>•</span>
            <Link to="/admin" className="hover:underline">Admin</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="text-4xl font-extrabold text-slate-300 mb-2">404</div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Page Not Found</h1>
        <p className="text-xs text-slate-500 mb-6">The requested route does not exist in PROJEXA.</p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Student Portal (Protected) */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<StudentLayout />}>
          <Route path="/student" element={<StudentDashboard />} />
        </Route>
      </Route>

      {/* Admin Portal (Protected) */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/projects" element={<AdminProjects />} />
        </Route>
      </Route>

      {/* Guide Portal (Protected) */}
      <Route element={<ProtectedRoute allowedRoles={['guide']} />}>
        <Route element={<GuideLayout />}>
          <Route path="/guide" element={<GuideDashboard />} />
          <Route path="/guide/teams" element={<AssignedTeams />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
