import React, { useState, useEffect } from 'react';
import { getEligibleGuides, assignTeamGuide } from '../../services/teamApi';

/**
 * Guide Assignment & Reassignment Modal (FE2-04)
 *
 * Requirements:
 * - Admin selects an active guide from eligible directory.
 * - Shows current faculty guide workload where available.
 * - Updates existing team via PATCH /api/v1/teams/:id.
 */
export default function GuideAssignModal({ team, onClose, onSuccess }) {
  const [guides, setGuides] = useState([]);
  const [selectedGuideId, setSelectedGuideId] = useState(team?.guideId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadGuides() {
      setIsLoading(true);
      const res = await getEligibleGuides();
      if (isMounted) {
        if (res.success) setGuides(res.data);
        setIsLoading(false);
      }
    }
    loadGuides();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await assignTeamGuide(team.id, selectedGuideId || null);
    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess(result.data);
      if (onClose) onClose();
    } else {
      setError(result.error?.message || 'Failed to update guide assignment');
    }
  };

  if (!team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Assign / Reassign Faculty Guide
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Team: <strong className="text-slate-700">{team.name}</strong> ({team.session})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Faculty Supervisor
            </label>

            {isLoading ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400">
                Loading eligible faculty guides...
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                <label className="flex items-center gap-3 p-2.5 rounded-lg border bg-white cursor-pointer hover:bg-slate-50 text-xs">
                  <input
                    type="radio"
                    name="guide"
                    value=""
                    checked={selectedGuideId === ''}
                    onChange={() => setSelectedGuideId('')}
                    className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-700">Unassigned (None)</span>
                    <span className="block text-slate-400 text-[11px]">Remove currently assigned guide</span>
                  </div>
                </label>

                {guides.map((g) => {
                  const isCurrent = team.guideId === g.id;
                  const isChecked = selectedGuideId === g.id;
                  return (
                    <label
                      key={g.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="guide"
                        value={g.id}
                        checked={isChecked}
                        onChange={() => setSelectedGuideId(g.id)}
                        className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{g.fullName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              (g.teamCount || 0) === 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            Load: {g.teamCount || 0} team(s)
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px] font-mono">{g.email}</span>
                        {isCurrent && (
                          <span className="block text-[10px] font-bold text-indigo-600 mt-0.5">
                            &bull; Currently Assigned Guide
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              {isSubmitting ? 'Updating...' : 'Save Guide Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
