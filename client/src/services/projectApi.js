/**
 * Project Management API Service (Member 2 — Frontend B)
 *
 * Coordinates with BE1 endpoints conforming to the PROJEXA standard envelope:
 * - GET   /api/v1/projects       (Role-scoped projects list)
 * - POST  /api/v1/projects       (Project registration with team mapping)
 * - PATCH /api/v1/projects/:id   (Project metadata update)
 *
 * Authentication: uses getAuthHeaders() from authSession.
 * Mock role headers are NEVER sent in real API mode or production.
 */

import { getAuthHeaders, isMockMode } from './authSession';

const DEV_PROJECTS_KEY = 'projexa_dev_projects_storage';

function getDevStoredProjects() {
  if (!import.meta.env.DEV) return [];
  try {
    const raw = sessionStorage.getItem(DEV_PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const initial = [
    {
      id: '690100000000000000000201',
      title: 'Projexa Demo Capstone',
      description: 'Web application designed for final-year academic project management across universities.',
      teamId: '690100000000000000000101',
      teamName: 'Projexa Demo Team',
      startDate: '2026-10-01',
      targetDate: '2026-12-31',
      status: 'active',
    },
  ];
  try {
    sessionStorage.setItem(DEV_PROJECTS_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

function saveDevStoredProjects(projects) {
  if (!import.meta.env.DEV) return;
  try {
    sessionStorage.setItem(DEV_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // ignore
  }
}

/**
 * Fetch all projects from GET /api/v1/projects
 */
export async function getProjects() {
  try {
    const response = await fetch('/api/v1/projects', {
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const json = await response.json();
      if (json.success && Array.isArray(json.data)) {
        return { success: true, data: json.data, isLiveApi: true };
      }
    }
    throw new Error(`API returned HTTP ${response.status}`);
  } catch (err) {
    if (isMockMode()) {
      return { success: true, data: getDevStoredProjects(), isLiveApi: false };
    }
    return { success: false, error: err.message, isLiveApi: false };
  }
}

/**
 * Create a project via POST /api/v1/projects
 * Payload: { title, description, teamId, startDate, targetDate, status }
 */
export async function createProject({ title, description, teamId, startDate, targetDate, status }) {
  // Client pre-validation
  if (!title || title.trim().length === 0) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Project title is required' } };
  }
  if (!teamId) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'An associated team must be selected' } };
  }
  if (!startDate) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Project start date is required' } };
  }
  if (!targetDate) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Target completion date is required' } };
  }

  // Date chronological validation: targetDate must be strictly after startDate
  const start = new Date(startDate);
  const target = new Date(targetDate);
  if (isNaN(start.getTime()) || isNaN(target.getTime())) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid start or target date format' } };
  }
  if (target <= start) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Target completion date must be strictly after the start date' },
    };
  }

  try {
    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: title.trim(),
        description: (description || '').trim(),
        teamId,
        startDate,
        targetDate,
        status: status || 'active',
      }),
    });

    const json = await response.json();
    if (response.ok && json.success) {
      return { success: true, data: json.data, isLiveApi: true };
    }
    return { success: false, error: json.error || { code: 'API_ERROR', message: `Server error ${response.status}` } };
  } catch (err) {
    if (isMockMode()) {
      const current = getDevStoredProjects();
      const newProject = {
        id: `690100000000000000000${String(current.length + 201).padStart(3, '0')}`,
        title: title.trim(),
        description: (description || '').trim(),
        teamId,
        teamName: 'Selected Team',
        startDate,
        targetDate,
        status: status || 'active',
      };
      const updated = [newProject, ...current];
      saveDevStoredProjects(updated);
      return { success: true, data: newProject, isLiveApi: false };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}
