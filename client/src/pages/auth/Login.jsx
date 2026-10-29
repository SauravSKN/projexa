import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const destination = (role) => (role === 'admin' ? '/admin' : role === 'guide' ? '/guide' : '/student');

  if (user) return <Navigate to={destination(user.role)} replace />;

  async function submit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Please enter email and password.');
    setBusy(true);
    setError('');
    try {
      const signedIn = await login({ email, password });
      navigate(destination(signedIn?.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <header className="text-center mb-7">
          <div className="inline-flex rounded-2xl bg-indigo-600 text-white font-black text-2xl px-5 py-3">P</div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Sign in to Projexa</h1>
          <p className="mt-1 text-sm text-slate-500">Academic project management platform</p>
        </header>
        <form onSubmit={submit} className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button
            type="submit"
            disabled={busy || isLoading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Signing in…' : isLoading ? 'Checking session…' : 'Sign in'}
          </button>
          <p className="text-xs text-center text-slate-500">Contact your administrator for account access.</p>
        </form>
        <p className="mt-5 text-center text-sm">
          <Link to="/" className="text-indigo-600 underline">Back to Projexa</Link>
        </p>
      </div>
    </main>
  );
}
