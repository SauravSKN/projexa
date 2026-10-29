import Project from '../models/Project.js';
import Team from '../models/Team.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './audit/auditBridge.js';

const PROJECT_POPULATE = [
  { path: 'teamId', select: 'name session memberIds guideId status' },
  { path: 'createdBy', select: 'fullName email role' },
];

/**
 * A project can only be attached to a finalized team that has a guide
 * assigned and between 3 and 5 active student members.
 */
export async function assertEligibleTeam(teamId) {
  const team = await Team.findById(teamId);
  if (!team) {
    throw ApiError.notFound('Team not found');
  }
  if (team.status !== 'finalized') {
    throw ApiError.badRequest('Projects can only be attached to a finalized team');
  }
  if (!team.guideId) {
    throw ApiError.badRequest(
      'The team must have a faculty guide assigned before a project is created',
    );
  }
  const memberCount = team.memberIds.length;
  if (memberCount < 3 || memberCount > 5) {
    throw ApiError.badRequest(
      'The team must have between 3 and 5 student members before a project is created',
    );
  }
  return team;
}

export async function createProject({ payload, actor }) {
  const team = await assertEligibleTeam(payload.teamId);

  const project = await Project.create({
    title: payload.title,
    description: payload.description,
    teamId: team._id,
    createdBy: actor._id,
    status: payload.status || 'proposed',
    startDate: payload.startDate || null,
    targetDate: payload.targetDate || null,
    category: payload.category,
  });

  await recordAudit({
    actorId: actor._id,
    action: 'PROJECT_CREATED',
    targetType: 'Project',
    targetId: project._id,
    fieldsChanged: ['title', 'description', 'status', 'teamId', 'startDate', 'targetDate'],
  });

  return project;
}

export async function updateProject({ projectId, payload, actor }) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }

  const updates = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.startDate !== undefined) updates.startDate = payload.startDate || null;
  if (payload.targetDate !== undefined) updates.targetDate = payload.targetDate || null;
  if (payload.category !== undefined) updates.category = payload.category;

  if (payload.teamId !== undefined && String(payload.teamId) !== String(project.teamId)) {
    const team = await assertEligibleTeam(payload.teamId);
    updates.teamId = team._id;
  }

  const fieldsChanged = Object.keys(updates);
  Object.assign(project, updates);
  await project.save();

  await recordAudit({
    actorId: actor._id,
    action: 'PROJECT_UPDATED',
    targetType: 'Project',
    targetId: project._id,
    fieldsChanged,
  });

  return project;
}

/** Project IDs the principal is allowed to see. */
export async function listProjectsForPrincipal(principal) {
  if (principal.role === 'admin') {
    return Project.find().populate(PROJECT_POPULATE).sort({ createdAt: -1 });
  }

  if (principal.role === 'guide') {
    const teams = await Team.find({ guideId: principal._id }).select('_id');
    return Project.find({ teamId: { $in: teams.map((team) => team._id) } })
      .populate(PROJECT_POPULATE)
      .sort({ createdAt: -1 });
  }

  const teams = await Team.find({ memberIds: principal._id }).select('_id');
  return Project.find({ teamId: { $in: teams.map((team) => team._id) } })
    .populate(PROJECT_POPULATE)
    .sort({ createdAt: -1 });
}

export async function getProjectForPrincipal(principal, projectId) {
  const project = await Project.findById(projectId).populate(PROJECT_POPULATE);
  if (!project) {
    throw ApiError.notFound('Project not found');
  }
  if (!canAccessProject(principal, project)) {
    throw ApiError.forbidden('You do not have access to this project');
  }
  return project;
}

export function canAccessProject(principal, project) {
  if (principal.role === 'admin') return true;

  const team = project.teamId;
  if (!team) return false;

  if (principal.role === 'guide') {
    if (!team.guideId) return false;
    const guideId = team.guideId._id ? team.guideId._id : team.guideId;
    return String(guideId) === String(principal._id);
  }

  return (team.memberIds || []).some(
    (member) => String(member._id ? member._id : member) === String(principal._id),
  );
}
