import React, { useState, useEffect } from 'react';
import { getTeams } from '../../services/teamApi';
import { createProject } from '../../services/projectApi';

/**
 * Project Registration Form (FE2-05)
 *
 * Requirements:
 * - Admin creates project with title, description, associated team, dates, and initial status.
 * - Validation: Target Date must be chronologically after Start Date.
 * - Associated team dropdown dynamically populated from active teams.
 * - Field-level validation error display.
 */
export default function ProjectForm({ onSuccess, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [status, setStatus] = useState('active');

  const [availableTeams, setAvailableTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadTeams() {
      setIsLoadingTeams(true);
      const res = await getTeams();
      if (isMounted) {
        if (res.success && Array.isArray(res.data)) {
          setAvailableTeams(res.data);
          if (res.data.length > 0) {
            setTeamId(res.data[0].id);
          }
        }
        setIsLoadingTeams(false);
      }
    }
    loadTeams();
    return () => {
      isMounted = false;
    };
  }, []);

  const validate = () => {
    const errors = {};
    if (!title.trim()) errors.title = 'Project title is required';
    if (!teamId) errors.teamId = 'Associated student team is required';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!targetDate) errors.targetDate = 'Target completion date is required';

    if (startDate && targetDate) {
      const start = new Date(startDate);
      const target = new Date(targetDate);
      if (target <= start) {
        errors.targetDate = 'Target completion date must be strictly after the start date';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    const result = await createProject({
      title,
      description,
      teamId,
      startDate,
      targetDate,
      status,
    });

    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess(result.data);
    } else {
      setServerError(result.error?.message || 'Failed to register project');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Register Capstone Project</h2>
          <p className="text-xs text-slate-500">
            Define capstone project title, scope, team mapping, and target milestones (FE2-05)
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        )}
      </div>

      {serverError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
          <strong>Validation Conflict:</strong> {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Project Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setFieldErrors((prev) => ({ ...prev, title: null }));
            }}
            placeholder="e.g. Distributed Consensus Engine for Edge Networks"
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
              fieldErrors.title ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
            }`}
          />
          {fieldErrors.title && (
            <p className="text-rose-600 text-[11px] mt-1">{fieldErrors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Project Description / Scope
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the academic capstone scope, expected deliverables, and domain objectives..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Row 2: Team Selection & Initial Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Associated Student Team <span className="text-rose-500">*</span>
            </label>
            {isLoadingTeams ? (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-400">
                Loading available teams...
              </div>
            ) : availableTeams.length === 0 ? (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                No teams found. Please create a team first.
              </div>
            ) : (
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, teamId: null }));
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                  fieldErrors.teamId ? 'border-rose-400' : 'border-slate-300'
                }`}
              >
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.session}) &bull; {t.members?.length || 0} members
                  </option>
                ))}
              </select>
            )}
            {fieldErrors.teamId && (
              <p className="text-rose-600 text-[11px] mt-1">{fieldErrors.teamId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active (Underway)</option>
              <option value="pending">Pending Guide Approval</option>
              <option value="draft">Draft Proposal</option>
            </select>
          </div>
        </div>

        {/* Row 3: Chronological Dates Validation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Start Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, startDate: null, targetDate: null }));
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.startDate ? 'border-rose-400' : 'border-slate-300'
              }`}
            />
            {fieldErrors.startDate && (
              <p className="text-rose-600 text-[11px] mt-1">{fieldErrors.startDate}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Completion Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => {
                setTargetDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, targetDate: null }));
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.targetDate ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
            {fieldErrors.targetDate && (
              <p className="text-rose-600 text-[11px] mt-1 font-medium">{fieldErrors.targetDate}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registering Project...
              </>
            ) : (
              'Register Project'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
