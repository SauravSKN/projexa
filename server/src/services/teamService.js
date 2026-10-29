import Team from '../models/Team.js';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { recordAudit } from './audit/auditBridge.js';

const ACTIVE_TEAM_STATUSES = ['pending', 'finalized'];
const TEAM_POPULATE = [
  { path: 'memberIds', select: 'fullName email role status' },
  { path: 'guideId', select: 'fullName email role status' },
  { path: 'createdBy', select: 'fullName email role' },
];

export async function assertActiveGuide(guideId) {
  if (!guideId) return null;

  const guide = await User.findById(guideId).select('role status fullName email');
  if (!guide) {
    throw ApiError.badRequest('The assigned guide does not exist');
  }
  if (guide.role !== 'guide') {
    throw ApiError.badRequest('The assigned guide must have the guide role');
  }
  if (guide.status !== 'active') {
    throw ApiError.badRequest('The assigned guide account is not active');
  }
  return guide;
}

export async function assertNoDuplicateStudents(memberIds = []) {
  const unique = new Set(memberIds.map((id) => String(id)));
  if (unique.size !== memberIds.length) {
    throw ApiError.badRequest('Team members must be unique');
  }
  return [...unique];
}

export async function assertActiveStudents(memberIds = []) {
  if (memberIds.length === 0) return [];

  const students = await User.find({
    _id: { $in: memberIds },
    role: 'student',
    status: 'active',
  }).select('_id');

  if (students.length !== memberIds.length) {
    throw ApiError.badRequest(
      'Every team member must be an active student account',
    );
  }
  return students;
}

/** Phase 1 policy: a student belongs to at most one non-archived team. */
export async function assertSingleActiveTeamPerStudent(memberIds = [], excludeTeamId = null) {
  if (memberIds.length === 0) return;

  const filter = {
    memberIds: { $in: memberIds },
    status: { $in: ACTIVE_TEAM_STATUSES },
  };
  if (excludeTeamId) {
    filter._id = { $ne: excludeTeamId };
  }

  const conflicts = await Team.find(filter).select('name memberIds');
  if (conflicts.length > 0) {
    throw ApiError.conflict('A student may only belong to one active team');
  }
}

export async function createTeam({ payload, actor }) {
  const memberIds = await assertNoDuplicateStudents(payload.memberIds || []);

  if (memberIds.length > 5) {
    throw ApiError.badRequest('A team must not have more than 5 student members');
  }

  const status = payload.status || 'pending';
  if (status === 'finalized' && memberIds.length < 3) {
    throw ApiError.badRequest(
      'A finalized team must have between 3 and 5 student members',
    );
  }

  const guideId = payload.guideId || null;
  await assertActiveGuide(guideId);
  await assertActiveStudents(memberIds);
  await assertSingleActiveTeamPerStudent(memberIds);

  const team = await Team.create({
    name: payload.name,
    description: payload.description,
    session: payload.session,
    memberIds,
    guideId,
    createdBy: actor._id,
    status,
  });

  await recordAudit({
    actorId: actor._id,
    action: 'TEAM_CREATED',
    targetType: 'Team',
    targetId: team._id,
    fieldsChanged: ['name', 'session', 'status', 'memberIds', 'guideId'],
  });

  return team;
}

export async function updateTeam({ teamId, payload, actor }) {
  const team = await Team.findById(teamId);
  if (!team) {
    throw ApiError.notFound('Team not found');
  }

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.session !== undefined) updates.session = payload.session;
  if (payload.status !== undefined) updates.status = payload.status;

  const memberIds =
    payload.memberIds !== undefined
      ? await assertNoDuplicateStudents(payload.memberIds)
      : team.memberIds.map((id) => id.toString());

  if (memberIds.length > 5) {
    throw ApiError.badRequest('A team must not have more than 5 student members');
  }

  const nextStatus = updates.status ?? team.status;
  if (nextStatus === 'finalized' && memberIds.length < 3) {
    throw ApiError.badRequest(
      'A finalized team must have between 3 and 5 student members',
    );
  }

  if (payload.guideId !== undefined) {
    await assertActiveGuide(payload.guideId);
    updates.guideId = payload.guideId || null;
  }

  await assertActiveStudents(memberIds);
  await assertSingleActiveTeamPerStudent(memberIds, team._id);

  const fieldsChanged = Object.keys(updates);
  if (payload.memberIds !== undefined) fieldsChanged.push('memberIds');

  Object.assign(team, updates);
  team.memberIds = memberIds;
  await team.save();

  await recordAudit({
    actorId: actor._id,
    action: payload.guideId !== undefined ? 'TEAM_ASSIGNED' : 'TEAM_UPDATED',
    targetType: 'Team',
    targetId: team._id,
    fieldsChanged,
  });

  return team;
}

/** Teams visible to the principal: admins see all, guides their own, students their own. */
export function listTeamsForPrincipal(principal) {
  if (principal.role === 'admin') {
    return Team.find().populate(TEAM_POPULATE).sort({ createdAt: -1 });
  }
  if (principal.role === 'guide') {
    return Team.find({ guideId: principal._id })
      .populate(TEAM_POPULATE)
      .sort({ createdAt: -1 });
  }
  return Team.find({ memberIds: principal._id })
    .populate(TEAM_POPULATE)
    .sort({ createdAt: -1 });
}

export async function getTeamForPrincipal(principal, teamId) {
  const team = await Team.findById(teamId).populate(TEAM_POPULATE);
  if (!team) {
    throw ApiError.notFound('Team not found');
  }
  if (!canAccessTeam(principal, team)) {
    throw ApiError.forbidden('You do not have access to this team');
  }
  return team;
}

export function canAccessTeam(principal, team) {
  if (principal.role === 'admin') return true;

  if (principal.role === 'guide') {
    if (!team.guideId) return false;
    const guideId = team.guideId._id ? team.guideId._id : team.guideId;
    return String(guideId) === String(principal._id);
  }

  return (team.memberIds || []).some(
    (member) => String(member._id ? member._id : member) === String(principal._id),
  );
}
