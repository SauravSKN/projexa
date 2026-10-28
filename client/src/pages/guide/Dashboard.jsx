import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../../services/authSession';

/**
 * Faculty Guide Dashboard View (FE2-01)
 *
 * Requirements:
 * - Assigned team count, project count, project list, team details overview.
 * - Clean empty states when unassigned.
 * - Guide-specific navigation to detailed teams view.
 * - Consumes GET /api/v1/dashboard/guide.
 */
export default function GuideDashboard() {
  const { user } = useAuthSession();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchGuideSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/dashboard/guide', {
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && isMounted) {
            setData(result.data);
            setIsLiveApi(true);
            setIsLoading(false);
            return;
          }
        }
        throw new Error(`Endpoint returned status ${response.status}`);
      } catch (err) {
        if (isMounted) {
          if (import.meta.env.DEV) {
            // Verified contract schema fallback from docs/api/dashboard.md
            setData({
              assignedTeamCount: 1,
              projectCount: 1,
              assignedTeams: [
                {
                  id: '690100000000000000000101',
                  name: 'Projexa Demo Team',
                  projectTitle: 'Projexa Demo Capstone',
                },
              ],
            });
            setIsLiveApi(false);
          } else {
            setError(err.message || 'Failed to load guide dashboard summary');
          }
          setIsLoading(false);
        }
      }
    }

    fetchGuideSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Guide Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Welcome, {user?.fullName || 'Faculty Guide'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Faculty Guide supervision overview & assigned student capstone projects
          </p>
        </div>

        {/* Data Source Indicator */}
        <div className="flex items-center gap-2">
          {isLiveApi ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
              Live Backend API
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="Backend aggregation endpoint /api/v1/dashboard/guide not mounted yet">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
              Dev Fixture Preview
            </span>
          )}

          <Link
            to="/guide/teams"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            View Assigned Teams
          </Link>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading assigned projects & teams...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <strong>Error loading guide summary:</strong> {error}
        </div>
      )}

      {/* Metrics & Content (FE2-01) */}
      {data && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Assigned Teams
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 text-lg">👥</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{data.assignedTeamCount}</span>
                <span className="text-xs text-slate-500 font-medium">teams under supervision</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Active student project teams allocated to you</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Supervised Projects
                </span>
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600 text-lg">📁</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{data.projectCount}</span>
                <span className="text-xs text-slate-500 font-medium">active capstones</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Academic projects undergoing guidance</p>
            </div>
          </div>

          {/* Assigned Teams Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Assigned Student Teams
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Teams allocated to you for academic milestone oversight
                </p>
              </div>
              <Link
                to="/guide/teams"
                className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
              >
                Full Roster &rarr;
              </Link>
            </div>

            {data.assignedTeams && data.assignedTeams.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {data.assignedTeams.map((team) => (
                  <div
                    key={team.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/75 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 text-base">{team.name}</h3>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          Active Team
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong className="text-slate-700">Project:</strong> {team.projectTitle || 'Project proposal pending'}
                      </p>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        ID: {team.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to="/guide/teams"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        View Team Roster
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state (FE2-01) */
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
                  📭
                </div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">
                  No Teams Currently Assigned
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  The department administrator has not allocated any capstone teams to your supervision roster yet.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
