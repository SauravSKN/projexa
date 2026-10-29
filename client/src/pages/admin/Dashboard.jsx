import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAuthHeaders, isMockMode } from '../../services/authSession';

/**
 * Admin Dashboard View (FE2-02)
 *
 * Requirements:
 * - Portfolio counts: Active Students, Active Guides, Total Teams, Projects.
 * - High-level guide workload summary table showing each faculty guide and their assigned team load.
 * - Consumes GET /api/v1/dashboard/admin with graceful fallback to dev fixture preview.
 */
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchAdminSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/v1/dashboard/admin', {
          headers: {
            'Accept': 'application/json',
            ...getAuthHeaders(),
          },
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
        // In development, provide the verified seed contract structure so the UI is testable
        // while clearly marking it as development preview data
        if (isMounted) {
          if (isMockMode()) {
            setData({
              studentCount: 5,
              guideCount: 2,
              teamCount: 1,
              projectCount: 1,
              guideLoad: [
                { guideId: '690100000000000000000011', guideName: 'Dr Ananya Shah', teamCount: 1 },
                { guideId: '690100000000000000000012', guideName: 'Dr Rohan Mehta', teamCount: 0 },
              ],
            });
            setIsLiveApi(false);
          } else {
            setError(err.message || 'Failed to load admin dashboard summary');
          }
          setIsLoading(false);
        }
      }
    }

    fetchAdminSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Department Admin Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Academic project portfolio overview and faculty allocation tracking
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
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="Backend aggregation endpoint /api/v1/dashboard/admin not mounted yet">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
              Dev Fixture Preview
            </span>
          )}

          <Link
            to="/admin/teams"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Manage Teams
          </Link>
          <Link
            to="/admin/projects"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Manage Projects
          </Link>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading department portfolio metrics...</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <strong>Error loading metrics:</strong> {error}
        </div>
      )}

      {/* Metric Cards Grid (FE2-02) */}
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Students */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Students
                </span>
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600 text-lg">🎓</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{data.studentCount}</span>
                <span className="text-xs text-slate-500 font-medium">registered</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Active student directory accounts</p>
            </div>

            {/* Active Guides */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Faculty Guides
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 text-lg">👨‍🏫</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{data.guideCount}</span>
                <span className="text-xs text-slate-500 font-medium">faculty</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Eligible supervisors in department</p>
            </div>

            {/* Total Teams */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Formed Teams
                </span>
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600 text-lg">👥</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{data.teamCount}</span>
                <span className="text-xs text-slate-500 font-medium">active</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Capstones formed across sessions</p>
            </div>

            {/* Total Projects */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Registered Projects
                </span>
                <span className="p-2 rounded-lg bg-amber-50 text-amber-600 text-lg">📁</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{data.projectCount}</span>
                <span className="text-xs text-slate-500 font-medium">projects</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Approved capstone project records</p>
            </div>
          </div>

          {/* Guide Workload Summary Table (FE2-02) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Faculty Guide Workload Distribution
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned team load across active department faculty guides (GET /api/v1/dashboard/admin)
                </p>
              </div>
              <Link
                to="/admin/teams"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Reassign Guide &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Faculty Guide</th>
                    <th scope="col" className="px-6 py-3">Guide Identifier</th>
                    <th scope="col" className="px-6 py-3">Assigned Teams</th>
                    <th scope="col" className="px-6 py-3">Workload Status</th>
                    <th scope="col" className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.guideLoad && data.guideLoad.length > 0 ? (
                    data.guideLoad.map((guide) => (
                      <tr key={guide.guideId} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {guide.guideName.replace(/^Dr\s+/i, '').charAt(0)}
                          </div>
                          <span>{guide.guideName}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">
                          {guide.guideId}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">{guide.teamCount}</span>
                          <span className="text-xs text-slate-500 ml-1">team(s)</span>
                        </td>
                        <td className="px-6 py-4">
                          {guide.teamCount === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                              Available (0 teams)
                            </span>
                          ) : guide.teamCount >= 3 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              High Load ({guide.teamCount} teams)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              Active Load ({guide.teamCount} team)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            to="/admin/teams"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Assign Teams
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm">
                        No faculty guide workload records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
