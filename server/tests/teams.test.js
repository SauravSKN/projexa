/* eslint no-unused-vars: off */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTestApp,
  createUser,
  loginAs,
  request,
  setupTestDatabase,
  teardownTestDatabase,
  TEST_PASSWORD,
} from './helpers/testContext.js';

async function seedActors() {
  const admin = await createUser({
    fullName: 'Team Admin',
    email: 'team.admin@test.com',
    role: 'admin',
  });
  const guide = await createUser({
    fullName: 'Assigned Guide',
    email: 'assigned.guide@test.com',
    role: 'guide',
  });
  const otherGuide = await createUser({
    fullName: 'Other Guide',
    email: 'other.guide@test.com',
    role: 'guide',
  });
  const students = [];
  for (let index = 0; index < 4; index += 1) {
    students.push(
      await createUser({
        fullName: `Team Student ${index + 1}`,
        email: `team.student${index + 1}@test.com`,
        role: 'student',
      }),
    );
  }
  const outsider = await createUser({
    fullName: 'Outsider Student',
    email: 'outsider.student@test.com',
    role: 'student',
  });

  return { admin, guide, otherGuide, students, outsider };
}

test('team management and resource authorization', async (t) => {
  const config = await setupTestDatabase();
  const app = buildTestApp(config);

  t.after(async () => {
    await teardownTestDatabase();
  });

  const { admin, guide, otherGuide, students, outsider } = await seedActors();
  const adminToken = await loginAs(app, 'team.admin@test.com');
  const guideToken = await loginAs(app, 'assigned.guide@test.com');
  const otherGuideToken = await loginAs(app, 'other.guide@test.com');
  const studentToken = await loginAs(app, 'team.student1@test.com');
  const outsiderToken = await loginAs(app, 'outsider.student@test.com');

  const memberIds = students.slice(0, 3).map((student) => student._id.toString());

  let teamId = null;

  await test('an administrator can create a valid team', async () => {
    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alpha Squad',
        session: '2026-27',
        description: 'Phase 1 test team',
        memberIds,
        guideId: guide._id.toString(),
        status: 'finalized',
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.team.name, 'Alpha Squad');
    assert.equal(response.body.data.team.session, '2026-27');
    assert.equal(response.body.data.team.memberIds.length, 3);
    assert.ok(response.body.data.team.id, 'expected a usable team id');

    teamId = response.body.data.team.id;
  });

  await test('students cannot create teams', async () => {
    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Rogue Squad',
        session: '2026-27',
        memberIds,
      });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('duplicate student identifiers are rejected', async () => {
    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate Squad',
        session: '2026-27',
        memberIds: [
          students[0]._id.toString(),
          students[0]._id.toString(),
          students[1]._id.toString(),
        ],
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  await test('teams with more than five members are rejected', async () => {
    const freshStudents = [];
    for (let index = 0; index < 6; index += 1) {
      freshStudents.push(
        await createUser({
          fullName: `Oversized Student ${index + 1}`,
          email: `oversized.student${index + 1}@test.com`,
          role: 'student',
        }),
      );
    }

    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Oversized Squad',
        session: '2026-27',
        memberIds: freshStudents.map((student) => student._id.toString()),
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  await test('a finalized team must have at least three members', async () => {
    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tiny Squad',
        session: '2026-27',
        memberIds: [students[3]._id.toString()],
        status: 'finalized',
      });

    assert.equal(response.status, 400);
  });

  await test('a guide assignment must reference an active guide account', async () => {
    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Wrong Guide Squad',
        session: '2026-27',
        memberIds: [students[3]._id.toString()],
        guideId: students[0]._id.toString(),
      });

    assert.equal(response.status, 400);
  });

  await test('a student may only belong to one active team', async () => {
    const response = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Second Squad',
        session: '2026-27',
        memberIds: [students[0]._id.toString()],
      });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'CONFLICT');
  });

  await test('students can read their own team', async () => {
    const response = await request(app)
      .get(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.team.name, 'Alpha Squad');
  });

  await test('students cannot read unrelated teams', async () => {
    const response = await request(app)
      .get(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('guides can read the teams assigned to them', async () => {
    const response = await request(app)
      .get(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${guideToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.team.name, 'Alpha Squad');
  });

  await test('guides cannot read unrelated teams', async () => {
    const response = await request(app)
      .get(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${otherGuideToken}`);

    assert.equal(response.status, 403);
  });

  await test('team listings are scoped to the caller', async () => {
    const guideList = await request(app)
      .get('/api/v1/teams')
      .set('Authorization', `Bearer ${guideToken}`);
    assert.equal(guideList.status, 200);
    assert.equal(guideList.body.data.teams.length, 1);

    const outsiderList = await request(app)
      .get('/api/v1/teams')
      .set('Authorization', `Bearer ${outsiderToken}`);
    assert.equal(outsiderList.status, 200);
    assert.equal(outsiderList.body.data.teams.length, 0);

    const adminList = await request(app)
      .get('/api/v1/teams')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminList.status, 200);
    assert.ok(adminList.body.data.teams.length >= 1);
  });

  await test('a malformed team identifier is rejected with 400', async () => {
    const response = await request(app)
      .get('/api/v1/teams/not-a-valid-id')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  await test('an unknown team identifier is rejected with 404', async () => {
    const response = await request(app)
      .get('/api/v1/teams/64b7f0f0f0f0f0f0f0f0f0f0')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  await test('only administrators can update a team', async () => {
    const studentUpdate = await request(app)
      .patch(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ description: 'Student should not be able to do this' });
    assert.equal(studentUpdate.status, 403);

    const adminUpdate = await request(app)
      .patch(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Updated by the administrator' });

    assert.equal(adminUpdate.status, 200);
    assert.equal(adminUpdate.body.data.team.description, 'Updated by the administrator');
  });

  await test('a guide can be assigned through a team update', async () => {
    const response = await request(app)
      .patch(`/api/v1/teams/${teamId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ guideId: otherGuide._id.toString() });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.team.guideId.id, otherGuide._id.toString());
  });
});
