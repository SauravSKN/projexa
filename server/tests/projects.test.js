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
    fullName: 'Project Admin',
    email: 'project.admin@test.com',
    role: 'admin',
  });
  const guide = await createUser({
    fullName: 'Project Guide',
    email: 'project.guide@test.com',
    role: 'guide',
  });
  const otherGuide = await createUser({
    fullName: 'Unrelated Guide',
    email: 'project.other.guide@test.com',
    role: 'guide',
  });
  const students = [];
  for (let index = 0; index < 3; index += 1) {
    students.push(
      await createUser({
        fullName: `Project Student ${index + 1}`,
        email: `project.student${index + 1}@test.com`,
        role: 'student',
      }),
    );
  }
  const outsider = await createUser({
    fullName: 'Project Outsider',
    email: 'project.outsider@test.com',
    role: 'student',
  });

  return { admin, guide, otherGuide, students, outsider };
}

test('project management and resource authorization', async (t) => {
  const config = await setupTestDatabase();
  const app = buildTestApp(config);

  t.after(async () => {
    await teardownTestDatabase();
  });

  const { admin, guide, otherGuide, students, outsider } = await seedActors();
  const adminToken = await loginAs(app, 'project.admin@test.com');
  const guideToken = await loginAs(app, 'project.guide@test.com');
  const otherGuideToken = await loginAs(app, 'project.other.guide@test.com');
  const studentToken = await loginAs(app, 'project.student1@test.com');
  const outsiderToken = await loginAs(app, 'project.outsider@test.com');

  const memberIds = students.map((student) => student._id.toString());

  const teamResponse = await request(app)
    .post('/api/v1/teams')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Project Squad',
      session: '2026-27',
      memberIds,
      guideId: guide._id.toString(),
      status: 'finalized',
    });
  assert.equal(teamResponse.status, 201);
  const teamId = teamResponse.body.data.team.id;

  let projectId = null;

  await test('an administrator can create a valid project', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Campus Navigation System',
        description: 'Phase 1 capstone project',
        teamId,
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.project.title, 'Campus Navigation System');
    assert.equal(response.body.data.project.status, 'proposed');
    assert.ok(response.body.data.project.id, 'expected a usable project id');

    projectId = response.body.data.project.id;
  });

  await test('a project cannot be attached to an unknown team', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Orphan Project',
        teamId: '64b7f0f0f0f0f0f0f0f0f0f0',
      });

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  await test('a malformed team identifier is rejected with 400', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Broken Project',
        teamId: 'not-an-id',
      });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  await test('students cannot create projects', async () => {
    const response = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Student Project', teamId });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('students only see projects of their own teams', async () => {
    const response = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.projects.length, 1);
    assert.equal(response.body.data.projects[0].title, 'Campus Navigation System');
  });

  await test('unrelated students cannot see the project', async () => {
    const response = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.projects.length, 0);
  });

  await test('guides see the projects of the teams assigned to them', async () => {
    const response = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${guideToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.projects.length, 1);
  });

  await test('guides do not see projects of unrelated teams', async () => {
    const response = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${otherGuideToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.projects.length, 0);
  });

  await test('a student of the team can open the project detail', async () => {
    const response = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.project.title, 'Campus Navigation System');
    assert.ok(response.body.data.project.teamId.memberIds, 'team members must be loaded');
  });

  await test('an unrelated student cannot open the project detail', async () => {
    const response = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    assert.equal(response.status, 403);
  });

  await test('an unrelated guide cannot open the project detail', async () => {
    const response = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${otherGuideToken}`);

    assert.equal(response.status, 403);
  });

  await test('only administrators can modify a project', async () => {
    const studentUpdate = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'active' });
    assert.equal(studentUpdate.status, 403);

    const adminUpdate = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });
    assert.equal(adminUpdate.status, 200);
    assert.equal(adminUpdate.body.data.project.status, 'active');
  });

  await test('invalid project status values are rejected', async () => {
    const response = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'not-a-real-status' });

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  await test('a malformed project identifier is rejected with 400', async () => {
    const response = await request(app)
      .get('/api/v1/projects/not-an-id')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(response.status, 400);
  });

  await test('an unknown project identifier is rejected with 404', async () => {
    const response = await request(app)
      .get('/api/v1/projects/64b7f0f0f0f0f0f0f0f0f0f0')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.error.code, 'NOT_FOUND');
  });

  await test('unauthenticated requests are rejected', async () => {
    const response = await request(app).get('/api/v1/projects');

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  });
});
