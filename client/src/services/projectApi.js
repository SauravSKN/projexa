/**
 * Project Management API Service (Member 2 — Frontend B)
 *
 * Coordinates with BE1 endpoints conforming to the PROJEXA standard envelope:
 * - GET  /api/v1/projects  (Role-scoped project directory)
 * - POST /api/v1/projects  (Admin project registration)
 *
 * Authentication: uses getAuthHeaders() from authSession.
 * Mock role headers are NEVER sent in real API mode or production.
 */

import { getAuthHeaders, isMockMode } from './authSession';

export const SEED_PROJECTS = [
  {
    id: '690100000000000000000201',
    title: 'Projexa Academic Management Platform',
    description: 'A comprehensive faculty-supervised academic project governance platform.',
    teamId: '690100000000000000000101',
    teamName: 'Projexa Demo Team',
    status: 'in-progress',
    startDate: '2026-08-01T00:00:00.000Z',
    targetDate: '2027-05-15T00:00:00.000Z',
    category: 'Web Application',
    maxGrade: 100,
  },
  {
    id: '690100000000000000000202',
    title: 'Autonomous Drone Navigation System',
    description: 'Indoor autonomous quadcopter positioning using visual-inertial odometry.',
    teamId: '690100000000000000000102',
    teamName: 'Aero Robotics Team',
    status: 'proposed',
    startDate: '2026-09-01T00:00:00.000Z',
    targetDate: '2027-04-30T00:00:00.000Z',
    category: 'Embedded Systems',
    maxGrade: 100,
  },
];

const DEV_PROJECTS_KEY = 'projexa_dev_projects_storage';

function getDevStoredProjects() {
  if (!import.meta.env.DEV) return [];
  try {
    const raw = sessionStorage.getItem(DEV_PROJECTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  saveDevStoredProjects(SEED_PROJECTS);
  return SEED_PROJECTS;
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
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const json = await response.json();
      const list = Array.isArray(json.data) ? json.data : json.data?.projects;
      if (json.success && Array.isArray(list)) {
        return { success: true, data: list, isLiveApi: true };
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
      error: { code: 'VALIDATION_ERROR', message: 'Target date must be strictly after start date' },
    };
  }

  try {
    const response = await fetch('/api/v1/projects', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title: title.trim(),
        description: (description || '').trim(),
        teamId,
        startDate: start.toISOString(),
        targetDate: target.toISOString(),
        status: status || 'proposed',
      }),
    });

    const json = await response.json();
    if (response.ok && json.success) {
      const data = json.data?.project || json.data;
      return { success: true, data, isLiveApi: true };
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
        teamName: `Team ${teamId.slice(-4)}`,
        status: status || 'proposed',
        startDate: start.toISOString(),
        targetDate: target.toISOString(),
        category: 'General',
        maxGrade: 100,
      };
      const updated = [newProject, ...current];
      saveDevStoredProjects(updated);
      return { success: true, data: newProject, isLiveApi: false };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}
