import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProjects } from '../../services/projectApi';
import ProjectForm from '../../components/project/ProjectForm';

/**
 * Admin Project Management Page (FE2-05, FE2-06)
 *
 * Requirements:
 * - Searchable project directory by title, team name, or status.
 * - Displays project details: title, scope, associated team, start date, target date, and status.
 * - Integrated ProjectForm for project registration with timeline chronological validation.
 * - Loading, empty, and data-source indicators.
 */
export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form toggle
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getProjects();
    if (res.success && Array.isArray(res.data)) {
      setProjects(res.data);
      setIsLiveApi(res.isLiveApi);
    } else {
      setError(res.error || 'Failed to fetch projects');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleProjectCreated = (newProject) => {
    setShowCreateForm(false);
    loadProjects();
  };

  // Search & filter logic
  const filteredProjects = projects.filter((project) => {
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = project.title?.toLowerCase().includes(q);
    const descMatch = project.description?.toLowerCase().includes(q);
    const teamMatch = project.teamName?.toLowerCase().includes(q);
    return titleMatch || descMatch || teamMatch;
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
            Project Management
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Register academic capstone projects, map student teams, and track delivery timelines
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
              <span>Register New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Project Registration Form (FE2-05) */}
      {showCreateForm && (
        <ProjectForm
          onSuccess={handleProjectCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Search and Filters Bar (FE2-06) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project title, team, or keywords..."
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
          <span className="text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Project Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
          </select>
          <span className="text-slate-400 text-xs font-semibold ml-2">
            ({filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'})
          </span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Loading capstone project records...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          <strong>Error loading projects:</strong> {error}
        </div>
      )}

      {/* Projects List (FE2-06) */}
      {!isLoading && !error && (
        <>
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-800">{project.title}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${
                            project.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : project.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {project.status || 'Active'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="text-right self-start sm:self-auto">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Mapped Team
                      </div>
                      <Link
                        to="/admin/teams"
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        {project.teamName || 'View Team'} &rarr;
                      </Link>
                    </div>
                  </div>

                  {/* Project Timeline & Metadata */}
                  <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-400 font-medium mr-1">Start Date:</span>
                        <span className="font-mono text-slate-700">{project.startDate || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium mr-1">Target Completion:</span>
                        <span className="font-mono text-slate-800 font-semibold">{project.targetDate || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400">
                      ID: {project.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
                📁
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">
                {searchQuery ? 'No Projects Match Your Search' : 'No Projects Registered'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {searchQuery
                  ? `No capstone projects matched "${searchQuery}". Try a different keyword or reset filters.`
                  : 'Register your first academic capstone project to assign milestone dates.'}
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
                  Register Project Now
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
