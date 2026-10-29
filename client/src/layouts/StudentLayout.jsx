import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuthSession } from '../services/authSession';

export default function StudentLayout() {
  const { user, logout } = useAuthSession();
  const [error, setError] = React.useState('');

  async function signOut() {
    try {
      await logout();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link to="/student" className="text-xl font-extrabold text-indigo-700">
            PROJEXA <span className="text-sm font-normal text-slate-500">Student</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-medium text-slate-700">{user?.fullName}</span>
            <button
              onClick={signOut}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {error && <p role="alert" className="max-w-6xl mx-auto text-red-700 text-sm p-3">{error}</p>}
      <main className="max-w-6xl mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
