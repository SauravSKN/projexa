import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeams } from '../../services/teamApi';
import TeamForm from '../../components/team/TeamForm';
import GuideAssignModal from '../../components/team/GuideAssignModal';

/**
 * Admin Team Management Page (FE2-03, FE2-04, FE2-06)
 *
 * Requirements:
 * - Searchable team directory by team name, session, or guide.
 * - Displays team details: 3–5 student members, academic session, status, and assigned guide.
 * - Integrated TeamForm for team creation.
 * - Integrated GuideAssignModal for guide assignment and reassignment.
 * - Loading, empty, and data-source indicators.
 */
export default function AdminTeams() {
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');

  // Modals & Drawers
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamForGuideAssign, setTeamForGuideAssign] = useState(null);

  const loadTeams = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getTeams();
    if (res.success && Array.isArray(res.data)) {
      setTeams(res.data);
      setIsLiveApi(res.isLiveApi);
    } else {
      setError(res.error || 'Failed to fetch teams');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleTeamCreated = (newTeam) => {
    setShowCreateForm(false);
    loadTeams();
  };

  const handleGuideAssigned = () => {
    setTeamForGuideAssign(null);
    loadTeams();
  };

  // Search & filter logic
  const filteredTeams = teams.filter((team) => {
    const matchesSession = sessionFilter === 'all' || team.session === sessionFilter;
    if (!matchesSession) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = team.name?.toLowerCase().includes(q);
    const sessionMatch = team.session?.toLowerCase().includes(q);
    const guideMatch = team.guideName?.toLowerCase().includes(q);
    const memberMatch = team.members?.some((m) =>
      m.fullName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
    return nameMatch || sessionMatch || guideMatch || memberMatch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/admin" className="text-xs text-slate-500 hover:text-slate-700">
              &larr; Admin Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mt-1">
            Team Management
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Create capstone teams, manage 3–5 student allocations, and assign faculty guides
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLiveApi ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>
              Live Backend API
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title="Using development fixtures">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
              Dev Fixture Data
            </span>
          )}

          {!showCreateForm && (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Create New Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Team Creation Form Drawer (FE2-03) */}
      {showCreateForm && (
        <TeamForm
          onSuccess={handleTeamCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Guide Assignment Modal (FE2-04) */}
      {teamForGuideAssign && (
        <GuideAssignModal
          team={teamForGuideAssign}
          onClose={() => setTeamForGuideAssign(null)}
          onSuccess={handleGuideAssigned}
        />
      )}

      {/* Search and Filters Bar (FE2-06) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team, student, or guide..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <span className="text-slate-500 font-medium">Session:</span>
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Academic Sessions</option>
            <option value="2026-27">2026-27</option>
            <option value="2025-26">2025-26</option>
          </select>
          <span className="text-slate-400 text-xs font-semibold ml-2">
            ({filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'})
          </span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading teams and student rosters...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <strong>Error loading teams:</strong> {error}
        </div>
      )}

      {/* Teams List (FE2-06) */}
      {!isLoading && !error && (
        <>
          {filteredTeams.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-800">{team.name}</h3>
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 uppercase">
                          {team.status || 'Active'}
                        </span>
                        <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                          Session: {team.session}
                        </span>
                      </div>
                      {team.projectTitle && (
                        <p className="text-xs text-slate-600 mt-1">
                          <strong className="text-slate-700">Project:</strong> {team.projectTitle}
                        </p>
                      )}
                    </div>

                    {/* Guide Assignment Action */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 font-semibold uppercase">
                          Faculty Guide
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          {team.guideName || (
                            <span className="text-amber-600 font-medium italic">Unassigned</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setTeamForGuideAssign(team)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        {team.guideId ? 'Reassign Guide' : 'Assign Guide'}
                      </button>
                    </div>
                  </div>

                  {/* Student Members Roster (3–5 students) */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Student Members ({team.members?.length || 0} of 3–5 assigned)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {team.members && team.members.length > 0 ? (
                        team.members.map((member, idx) => (
                          <div
                            key={member.id || idx}
                            className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 text-xs"
                          >
                            <div className="font-semibold text-slate-800 truncate">
                              {member.fullName}
                            </div>
                            <div className="text-slate-400 text-[10px] truncate font-mono">
                              {member.email}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-xs text-slate-400 italic">
                          No student members recorded for this team.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
                👥
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">
                {searchQuery ? 'No Teams Match Your Query' : 'No Teams Registered'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {searchQuery
                  ? `No capstone teams matched "${searchQuery}". Try adjusting your search query or session filter.`
                  : 'Get started by creating your first academic capstone team.'}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Clear Search Filter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                >
                  Create Team Now
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
