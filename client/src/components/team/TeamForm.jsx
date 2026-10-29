import React, { useState, useEffect } from 'react';
import { getEligibleStudents, getEligibleGuides, createTeam } from '../../services/teamApi';

/**
 * Team Creation Form (FE2-03, FE2-04)
 *
 * Requirements:
 * - Admin enters Team Name and Academic Session.
 * - Admin selects 3–5 unique students from authorized directory.
 * - Prevents duplicate student selection and enforces 3-5 member boundaries.
 * - Admin selects an active guide and views their current load.
 * - Field-level validation and server error display.
 */
export default function TeamForm({ onSuccess, onCancel }) {
  const [name, setName] = useState('');
  const [session, setSession] = useState('2026-27');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedGuideId, setSelectedGuideId] = useState('');

  const [availableStudents, setAvailableStudents] = useState([]);
  const [availableGuides, setAvailableGuides] = useState([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDirectories() {
      setIsLoadingDirectory(true);
      const [studentsRes, guidesRes] = await Promise.all([
        getEligibleStudents(),
        getEligibleGuides(),
      ]);
      if (isMounted) {
        if (studentsRes.success) setAvailableStudents(studentsRes.data);
        if (guidesRes.success) setAvailableGuides(guidesRes.data);
        setIsLoadingDirectory(false);
      }
    }
    loadDirectories();
    return () => {
      isMounted = false;
    };
  }, []);

  // Student toggle handler ensuring uniqueness and max 5
  const toggleStudent = (studentId) => {
    setFieldErrors((prev) => ({ ...prev, members: null }));
    setServerError(null);

    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      if (selectedStudentIds.length >= 5) {
        setFieldErrors((prev) => ({
          ...prev,
          members: 'Maximum 5 students allowed per team',
        }));
        return;
      }
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Team name is required';
    if (!session.trim()) errors.session = 'Academic session is required';
    if (selectedStudentIds.length < 3) {
      errors.members = `Please select at least 3 students (currently selected: ${selectedStudentIds.length})`;
    } else if (selectedStudentIds.length > 5) {
      errors.members = 'A team cannot have more than 5 students';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError(null);

    const result = await createTeam({
      name,
      session,
      memberIds: selectedStudentIds,
      guideId: selectedGuideId || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      if (onSuccess) onSuccess(result.data);
    } else {
      const errMsg = result.error?.message || 'Failed to create team';
      setServerError(errMsg);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Create New Capstone Team</h2>
          <p className="text-xs text-slate-500">
            Form a student team, enforce 3–5 member constraints, and assign a supervisor (FE2-03)
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Team Name & Session */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Team Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((prev) => ({ ...prev, name: null }));
              }}
              placeholder="e.g. Autonomous Vision Team"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-rose-600 text-[11px] mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Session <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={session}
              onChange={(e) => {
                setSession(e.target.value);
                setFieldErrors((prev) => ({ ...prev, session: null }));
              }}
              placeholder="e.g. 2026-27"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 ${
                fieldErrors.session ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
            {fieldErrors.session && (
              <p className="text-rose-600 text-[11px] mt-1">{fieldErrors.session}</p>
            )}
          </div>
        </div>

        {/* Row 2: Student Member Selection (3–5 constraint) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Select Student Members (3–5 Unique Students) <span className="text-rose-500">*</span>
            </label>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                selectedStudentIds.length >= 3 && selectedStudentIds.length <= 5
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {selectedStudentIds.length} of 3–5 selected
            </span>
          </div>

          <p className="text-[11px] text-slate-500 mb-2">
            Click students to add or remove them from the roster. Only registered student accounts are eligible.
          </p>

          {isLoadingDirectory ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400">
              Loading student directory...
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white">
              {availableStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70 text-indigo-900 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 pointer-events-none"
                      />
                      <div>
                        <div className="text-slate-800 font-medium">{student.fullName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{student.email}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-indigo-600 font-bold text-[11px]">Selected</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {fieldErrors.members && (
            <p className="text-rose-600 text-[11px] mt-1.5 font-medium">{fieldErrors.members}</p>
          )}
        </div>

        {/* Row 3: Guide Assignment (FE2-04) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Assign Faculty Guide (Optional during creation)
          </label>
          <select
            value={selectedGuideId}
            onChange={(e) => setSelectedGuideId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- No Guide Assigned Yet (Assign Later) --</option>
            {availableGuides.map((guide) => (
              <option key={guide.id} value={guide.id}>
                {guide.fullName} &bull; Current Load: {guide.teamCount ?? 0} team(s)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Guides can be reassigned at any time from the Team Management roster.
          </p>
        </div>

        {/* Action Buttons */}
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
                Creating Team...
              </>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
