/**
 * Team Management API Service (Member 2 — Frontend B)
 *
 * Coordinates with BE1 endpoints conforming to the PROJEXA standard envelope:
 * - GET   /api/v1/teams               (Role-scoped teams list)
 * - GET   /api/v1/users?role=student  (Eligible student directory)
 * - GET   /api/v1/users?role=guide    (Active faculty guide directory)
 * - POST  /api/v1/teams               (Team creation with 3-5 students)
 * - PATCH /api/v1/teams/:id           (Guide assignment/reassignment)
 *
 * Authentication: uses getAuthHeaders() from authSession.
 * Mock role headers are NEVER sent in real API mode or production.
 */

import { getAuthHeaders, isMockMode } from './authSession';

export const SEED_STUDENTS = [
  { id: '690100000000000000000021', fullName: 'Aarav Patel', email: 'student.a@demo.projexa.invalid', role: 'student', teamId: '690100000000000000000101' },
  { id: '690100000000000000000022', fullName: 'Diya Rao', email: 'student.b@demo.projexa.invalid', role: 'student', teamId: '690100000000000000000101' },
  { id: '690100000000000000000023', fullName: 'Ishaan Das', email: 'student.c@demo.projexa.invalid', role: 'student', teamId: '690100000000000000000101' },
  { id: '690100000000000000000024', fullName: 'Meera Nair', email: 'student.d@demo.projexa.invalid', role: 'student', teamId: '690100000000000000000101' },
  { id: '690100000000000000000025', fullName: 'Kabir Sen', email: 'unassigned@demo.projexa.invalid', role: 'student', teamId: null },
  { id: '690100000000000000000026', fullName: 'Riya Gupta', email: 'student.f@demo.projexa.invalid', role: 'student', teamId: null },
  { id: '690100000000000000000027', fullName: 'Aditya Joshi', email: 'student.g@demo.projexa.invalid', role: 'student', teamId: null },
  { id: '690100000000000000000028', fullName: 'Tanvi Kulkarni', email: 'student.h@demo.projexa.invalid', role: 'student', teamId: null },
];

export const SEED_GUIDES = [
  { id: '690100000000000000000011', fullName: 'Dr Ananya Shah', email: 'guide.a@demo.projexa.invalid', role: 'guide', teamCount: 1, department: 'Computer Science' },
  { id: '690100000000000000000012', fullName: 'Dr Rohan Mehta', email: 'guide.b@demo.projexa.invalid', role: 'guide', teamCount: 0, department: 'Computer Science' },
  { id: '690100000000000000000013', fullName: 'Dr Vikram Malhotra', email: 'guide.c@demo.projexa.invalid', role: 'guide', teamCount: 0, department: 'Computer Science' },
];

const DEV_TEAMS_KEY = 'projexa_dev_teams_storage';

function getDevStoredTeams() {
  if (!import.meta.env.DEV) return [];
  try {
    const raw = sessionStorage.getItem(DEV_TEAMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  const initial = [
    {
      id: '690100000000000000000101',
      name: 'Projexa Demo Team',
      session: '2026-27',
      status: 'finalized',
      guideId: '690100000000000000000011',
      guideName: 'Dr Ananya Shah',
      members: SEED_STUDENTS.slice(0, 4),
      projectTitle: 'Projexa Academic Platform',
    },
  ];
  saveDevStoredTeams(initial);
  return initial;
}

function saveDevStoredTeams(teams) {
  if (!import.meta.env.DEV) return;
  try {
    sessionStorage.setItem(DEV_TEAMS_KEY, JSON.stringify(teams));
  } catch {
    // ignore
  }
}

/**
 * Fetch all teams from GET /api/v1/teams
 */
export async function getTeams() {
  try {
    const response = await fetch('/api/v1/teams', {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const json = await response.json();
      const list = Array.isArray(json.data) ? json.data : json.data?.teams;
      if (json.success && Array.isArray(list)) {
        return { success: true, data: list, isLiveApi: true };
      }
    }
    throw new Error(`API returned HTTP ${response.status}`);
  } catch (err) {
    if (isMockMode()) {
      return { success: true, data: getDevStoredTeams(), isLiveApi: false };
    }
    return { success: false, error: err.message, isLiveApi: false };
  }
}

/**
 * Fetch eligible students from GET /api/v1/users?role=student
 */
export async function getEligibleStudents() {
  try {
    const response = await fetch('/api/v1/users?role=student', {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const json = await response.json();
      const list = Array.isArray(json.data) ? json.data : json.data?.users;
      if (json.success && Array.isArray(list)) {
        return { success: true, data: list, isLiveApi: true };
      }
    }
    throw new Error(`API returned HTTP ${response.status}`);
  } catch (err) {
    if (isMockMode()) {
      return { success: true, data: SEED_STUDENTS, isLiveApi: false };
    }
    return { success: false, error: err.message, isLiveApi: false };
  }
}

/**
 * Fetch active guides from GET /api/v1/users?role=guide
 */
export async function getEligibleGuides() {
  try {
    const response = await fetch('/api/v1/users?role=guide', {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (response.ok) {
      const json = await response.json();
      const list = Array.isArray(json.data) ? json.data : json.data?.users;
      if (json.success && Array.isArray(list)) {
        return { success: true, data: list, isLiveApi: true };
      }
    }
    throw new Error(`API returned HTTP ${response.status}`);
  } catch (err) {
    if (isMockMode()) {
      return { success: true, data: SEED_GUIDES, isLiveApi: false };
    }
    return { success: false, error: err.message, isLiveApi: false };
  }
}

/**
 * Create a team via POST /api/v1/teams
 * Payload: { name, session, memberIds, guideId }
 */
export async function createTeam({ name, session, memberIds, guideId }) {
  // Client pre-validation
  if (!name || name.trim().length === 0) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Team name is required' } };
  }
  if (!session || session.trim().length === 0) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Academic session is required' } };
  }
  if (!Array.isArray(memberIds) || memberIds.length < 3 || memberIds.length > 5) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'A team must have between 3 and 5 unique student members' } };
  }
  const uniqueMembers = new Set(memberIds);
  if (uniqueMembers.size !== memberIds.length) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Duplicate student members detected in submission' } };
  }

  try {
    const response = await fetch('/api/v1/teams', {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: name.trim(), session: session.trim(), memberIds, guideId: guideId || null }),
    });

    const json = await response.json();
    if (response.ok && json.success) {
      const data = json.data?.team || json.data;
      return { success: true, data, isLiveApi: true };
    }
    return { success: false, error: json.error || { code: 'API_ERROR', message: `Server error ${response.status}` } };
  } catch (err) {
    if (isMockMode()) {
      // Simulate successful local dev team creation with seed data resolution
      const current = getDevStoredTeams();
      const resolvedMembers = memberIds.map((id) => {
        const found = SEED_STUDENTS.find((s) => s.id === id);
        return found || { id, fullName: `Student ${id.slice(-4)}`, email: `student.${id.slice(-4)}@demo.projexa.invalid` };
      });
      const resolvedGuide = guideId ? SEED_GUIDES.find((g) => g.id === guideId) : null;

      const newTeam = {
        id: `690100000000000000000${String(current.length + 101).padStart(3, '0')}`,
        name: name.trim(),
        session: session.trim(),
        status: 'draft',
        guideId: guideId || null,
        guideName: resolvedGuide ? resolvedGuide.fullName : null,
        members: resolvedMembers,
        projectTitle: null,
      };
      const updated = [newTeam, ...current];
      saveDevStoredTeams(updated);
      return { success: true, data: newTeam, isLiveApi: false };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}

/**
 * Assign or reassign guide via PATCH /api/v1/teams/:id
 * Payload: { guideId }
 */
export async function assignTeamGuide(teamId, guideId) {
  try {
    const response = await fetch(`/api/v1/teams/${teamId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(),
      body: JSON.stringify({ guideId: guideId || null }),
    });

    const json = await response.json();
    if (response.ok && json.success) {
      const data = json.data?.team || json.data;
      return { success: true, data, isLiveApi: true };
    }
    return { success: false, error: json.error || { code: 'API_ERROR', message: `Server error ${response.status}` } };
  } catch (err) {
    if (isMockMode()) {
      const current = getDevStoredTeams();
      const resolvedGuide = guideId ? SEED_GUIDES.find((g) => g.id === guideId) : null;
      const updated = current.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            guideId: guideId || null,
            guideName: resolvedGuide ? resolvedGuide.fullName : null,
          };
        }
        return team;
      });
      saveDevStoredTeams(updated);
      return { success: true, data: { teamId, guideId }, isLiveApi: false };
    }
    return { success: false, error: { code: 'NETWORK_ERROR', message: err.message } };
  }
}
