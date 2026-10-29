import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboardService, DashboardAccessError } from '../src/services/dashboard/dashboardService.js';
import { registerDashboardRoutes } from '../src/services/dashboard/registerDashboardRoutes.js';

const ids = {
  admin: 'a1', guideA: 'g1', guideB: 'g2',
  studentA: 's1', studentB: 's2', studentC: 's3', studentD: 's4', unassigned: 's5',
  team: 't1', project: 'p1',
};

const users = [
  { _id: ids.admin, fullName: 'Demo Admin', role: 'admin', status: 'active' },
  { _id: ids.guideA, fullName: 'Dr Ananya Shah', role: 'guide', status: 'active' },
  { _id: ids.guideB, fullName: 'Dr Rohan Mehta', role: 'guide', status: 'active' },
  ...['studentA', 'studentB', 'studentC', 'studentD', 'unassigned'].map((key) => ({
    _id: ids[key], fullName: key, role: 'student', status: 'active',
  })),
];
const teams = [{ _id: ids.team, name: 'Demo Team', guideId: ids.guideA, memberIds: ['s1', 's2', 's3', 's4'] }];
const projects = [{ _id: ids.project, teamId: ids.team, title: 'Demo Project', status: 'active' }];

function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    const value = row[key];
    if (expected && typeof expected === 'object' && '$in' in expected) {
      return expected.$in.some((item) => String(item) === String(value));
    }
    if (expected && typeof expected === 'object' && '$ne' in expected) {
      return value !== expected.$ne;
    }
    if (Array.isArray(value)) return value.some((item) => String(item) === String(expected));
    return String(value) === String(expected);
  });
}

const query = (value) => ({ select: () => query(value), lean: async () => value });

function model(rows) {
  return {
    findById: (key) => query(rows.find((row) => String(row._id) === String(key)) ?? null),
    findOne: (filter) => query(rows.find((row) => matches(row, filter)) ?? null),
    find: (filter) => query(rows.filter((row) => matches(row, filter))),
    countDocuments: async (filter) => rows.filter((row) => matches(row, filter)).length,
    aggregate: async () => {
      const grouped = new Map();
      for (const row of rows) {
        if (!row.guideId) continue;
        grouped.set(row.guideId, (grouped.get(row.guideId) ?? 0) + 1);
      }
      return [...grouped].map(([_id, teamCount]) => ({ _id, teamCount }));
    },
  };
}

function setup(data = { users, teams, projects }) {
  return createDashboardService({
    User: model(data.users), Team: model(data.teams), Project: model(data.projects),
  });
}

test('student summary exposes own team, current project and guide only', async () => {
  const result = await setup().student({ _id: ids.studentA });
  assert.deepEqual(result, {
    userName: 'studentA',
    team: { id: 't1', name: 'Demo Team', memberCount: 4 },
    project: { id: 'p1', title: 'Demo Project', status: 'active' },
    guide: { name: 'Dr Ananya Shah' },
  });
  assert.equal(JSON.stringify(result).includes('passwordHash'), false);
  assert.equal(JSON.stringify(result).includes('memberIds'), false);
});

test('student not assigned to a team gets explicit empty state', async () => {
  assert.deepEqual(await setup().student({ _id: ids.unassigned }), {
    userName: 'unassigned', team: null, project: null, guide: null,
  });
});

test('guide sees assigned team and project, not another guide’s data', async () => {
  const service = setup();
  assert.deepEqual(await service.guide({ _id: ids.guideA }), {
    assignedTeamCount: 1, projectCount: 1,
    assignedTeams: [{ id: 't1', name: 'Demo Team', projectTitle: 'Demo Project' }],
  });
  assert.deepEqual(await service.guide({ _id: ids.guideB }), {
    assignedTeamCount: 0, projectCount: 0, assignedTeams: [],
  });
});

test('admin counts and guide workload agree with fixture rows', async () => {
  assert.deepEqual(await setup().admin({ _id: ids.admin }), {
    studentCount: 5, guideCount: 2, teamCount: 1, projectCount: 1,
    guideLoad: [
      { guideId: 'g1', guideName: 'Dr Ananya Shah', teamCount: 1 },
      { guideId: 'g2', guideName: 'Dr Rohan Mehta', teamCount: 0 },
    ],
  });
});

test('recomputed summaries respond to changed assignments (no stale cache)', async () => {
  const data = { users, teams: teams.map((row) => ({ ...row })), projects };
  const service = setup(data);
  assert.equal((await service.guide({ _id: ids.guideA })).assignedTeamCount, 1);
  data.teams[0].guideId = ids.guideB;
  assert.equal((await service.guide({ _id: ids.guideA })).assignedTeamCount, 0);
  assert.equal((await service.guide({ _id: ids.guideB })).assignedTeamCount, 1);
});

test('roles, disabled identities and missing sessions fail closed at service level', async () => {
  const service = setup();
  await assert.rejects(service.admin({ _id: ids.studentA }), DashboardAccessError);
  await assert.rejects(service.student({ _id: ids.guideA }), DashboardAccessError);
  await assert.rejects(service.student({}), { status: 401 });
  const disabledUsers = users.map((user) => user._id === ids.studentA ? { ...user, status: 'disabled' } : user);
  await assert.rejects(setup({ users: disabledUsers, teams, projects }).student({ _id: ids.studentA }), { status: 403 });
});

test('router exposes only three role-scoped GET endpoints and standard envelope', async () => {
  const registrations = [];
  const router = { get: (...args) => registrations.push(args) };
  registerDashboardRoutes(router, {
    authenticate: (req, res, next) => next(), service: setup(),
  });
  assert.deepEqual(registrations.map(([path]) => path), ['/student', '/guide', '/admin']);
  const studentRoute = registrations[0];
  const response = {
    statusCode: null, body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
  let calledNext = false;
  studentRoute[2]({ user: { _id: ids.guideA, role: 'guide', status: 'active' } }, response, () => { calledNext = true; });
  assert.equal(response.statusCode, 403);
  assert.equal(calledNext, false);
  studentRoute[2]({ user: null }, response, () => { calledNext = true; });
  assert.equal(response.statusCode, 401);
  studentRoute[2]({ user: { _id: ids.studentA, role: 'student', status: 'active' } }, response, () => { calledNext = true; });
  assert.equal(calledNext, true);
  await studentRoute[3]({ user: { _id: ids.studentA, role: 'student', status: 'active' } }, response, (err) => { throw err; });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.team.id, ids.team);
});
