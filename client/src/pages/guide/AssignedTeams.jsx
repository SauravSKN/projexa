import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../../services/authSession';

/**
 * Guide Assigned Teams View (FE2-01)
 *
 * Requirements:
 * - Detailed breakdown of teams under guide supervision.
 * - Shows team roster (3–5 student members), project title, and academic session.
 * - Conforms to isolation constraint: Guide sees only their assigned teams,
 *   never other guides' teams.
 */
export default function AssignedTeams() {
  const { user } = useAuthSession();
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchAssignedTeams() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/teams', {
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data) && isMounted) {
            setTeams(result.data);
            setIsLiveApi(true);
            setIsLoading(false);
            return;
          }
        }
        throw new Error(`Endpoint returned status ${response.status}`);
      } catch (err) {
        if (isMounted) {
          if (import.meta.env.DEV) {
            // Verified contract seed fallback matching server/src/seeds/seedDevelopment.js
            setTeams([
              {
                id: '690100000000000000000101',
                name: 'Projexa Demo Team',
                session: '2026-27',
                status: 'finalized',
                project: {
                  id: '690100000000000000000201',
                  title: 'Projexa Demo Capstone',
                  description: 'Academic project management platform for final-year projects.',
                  status: 'active',
                  startDate: '2026-10-01',
                  targetDate: '2026-12-31',
                },
                members: [
                  { id: 'u1', fullName: 'Aarav Patel', email: 'student.a@demo.projexa.invalid' },
                  { id: 'u2', fullName: 'Diya Rao', email: 'student.b@demo.projexa.invalid' },
                  { id: 'u3', fullName: 'Ishaan Das', email: 'student.c@demo.projexa.invalid' },
                  { id: 'u4', fullName: 'Meera Nair', email: 'student.d@demo.projexa.invalid' },
                ],
              },
            ]);
            setIsLiveApi(false);
          } else {
            setError(err.message || 'Failed to load assigned teams');
          }
          setIsLoading(false);
        }
      }
    }

    fetchAssignedTeams();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/guide" className="text-xs text-slate-500 hover:text-slate-700">
              &larr; Guide Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Supervised Teams Roster
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Detailed team memberships and milestone project statuses for {user?.fullName || 'Faculty Guide'}
          </p>
        </div>

        {/* Status Pill */}
        <div>
          {isLiveApi ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
              Live Backend API
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
              Dev Fixture Preview
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading assigned teams & student rosters...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <strong>Error loading teams:</strong> {error}
        </div>
      )}

      {/* Teams list */}
      {!isLoading && !error && (
        <>
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Team Card Header */}
                  <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800">{team.name}</h2>
                        <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                          {team.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Academic Session: <strong className="text-slate-700">{team.session}</strong> &bull; Team ID: <span className="font-mono text-slate-500">{team.id}</span>
                      </p>
                    </div>

                    <div className="text-xs text-slate-500 font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                      Members: <span className="font-bold text-slate-800">{team.members?.length || 0} students</span>
                    </div>
                  </div>

                  {/* Team Body: Project info + Members list */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Project Information */}
                    <div className="lg:col-span-1 bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Associated Capstone Project
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-2">
                          {team.project?.title || 'No Project Registered Yet'}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-3 mb-4">
                          {team.project?.description || 'The team project proposal has not yet been registered by the administrator.'}
                        </p>
                      </div>

                      {team.project && (
                        <div className="border-t border-slate-200 pt-3 text-xs space-y-1 text-slate-500">
                          <div>
                            Status:{' '}
                            <span className="font-semibold text-slate-800 capitalize">
                              {team.project.status}
                            </span>
                          </div>
                          <div>
                            Target:{' '}
                            <span className="font-mono text-slate-700">
                              {team.project.targetDate}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Student Roster (3–5 members constraint) */}
                    <div className="lg:col-span-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Assigned Student Members (3–5 Students)
                      </div>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                        {team.members && team.members.length > 0 ? (
                          team.members.map((member, idx) => (
                            <div
                              key={member.id || idx}
                              className="px-4 py-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px]">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-800">{member.fullName}</div>
                                  <div className="text-slate-400 font-mono text-[11px]">{member.email}</div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                Student
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-slate-400 text-xs">
                            No students registered for this team yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
                👥
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">
                No Assigned Teams Found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                You do not currently have any student project teams assigned to your supervision roster.
              </p>
              <Link
                to="/guide"
                className="inline-flex px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
              >
                Back to Dashboard
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
