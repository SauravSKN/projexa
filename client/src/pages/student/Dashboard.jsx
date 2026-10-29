import React, { useEffect, useState } from 'react';
import { useAuthSession, isMockMode, getAuthHeaders } from '../../services/authSession';

export default function StudentDashboard() {
  const { user } = useAuthSession();
  const [state, setState] = useState({ loading: true, data: {}, error: '' });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (isMockMode()) {
          if (active) setState({ loading: false, data: {}, error: '' });
          return;
        }
        const response = await fetch('/api/v1/dashboard/student', {
          credentials: 'include',
          headers: getAuthHeaders(),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.success === false) {
          throw new Error(body.error?.message || 'Dashboard unavailable');
        }
        if (active) setState({ loading: false, data: body.data || {}, error: '' });
      } catch (error) {
        if (active) setState({ loading: false, data: {}, error: error.message });
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const team = state.data.team || state.data.student?.team;
  const project = state.data.project || state.data.student?.project;
  const guide = state.data.guide;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-indigo-700 text-sm font-semibold uppercase tracking-wider">Student portal</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">Welcome, {user?.fullName || 'Student'}</h1>
        <p className="text-slate-500 mt-2">Your team and academic project at a glance.</p>
      </div>

      {isMockMode() && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
          Development fixture preview — not real project data.
        </p>
      )}

      {state.loading && <p role="status">Loading your dashboard…</p>}
      {state.error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-rose-700">{state.error}</p>}

      {!state.loading && !state.error && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">My team</h2>
            <p className="text-xl font-bold text-slate-900 mt-2">{team?.name || 'Awaiting assignment'}</p>
            {team ? (
              <p className="text-sm text-slate-500 mt-2">
                Members: {team.memberCount || 1} student{team.memberCount === 1 ? '' : 's'}
                {guide?.name ? ` • Guide: ${guide.name}` : ' • Guide: Not yet assigned'}
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-2">An administrator will add you to a project team.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">My project</h2>
            <p className="text-xl font-bold text-slate-900 mt-2">{project?.title || 'No project registered'}</p>
            <p className="text-sm text-slate-500 mt-2">
              {project ? `Status: ${project.status}` : 'Project details appear after allocation.'}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
