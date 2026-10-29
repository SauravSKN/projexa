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

test('registration and role privilege boundaries', async (t) => {
  const config = await setupTestDatabase();
  const app = buildTestApp(config);

  t.after(async () => {
    await teardownTestDatabase();
  });

  await test('public users cannot register themselves as administrators', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sneaky Admin',
        email: 'sneaky.admin@test.com',
        password: TEST_PASSWORD,
        role: 'admin',
      });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('public users cannot register themselves as guides', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sneaky Guide',
        email: 'sneaky.guide@test.com',
        password: TEST_PASSWORD,
        role: 'guide',
      });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('the stored role is always student for public registrations', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Regular Student',
        email: 'regular.student@test.com',
        password: TEST_PASSWORD,
      });

    const token = await loginAs(app, 'regular.student@test.com');
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(me.body.data.user.role, 'student');
  });

  await test('an administrator can provision guide and admin accounts', async () => {
    await createUser({
      fullName: 'Root Admin',
      email: 'root.admin@test.com',
      role: 'admin',
    });
    const adminToken = await loginAs(app, 'root.admin@test.com');

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Faculty Guide',
        email: 'faculty.guide@test.com',
        password: TEST_PASSWORD,
        role: 'guide',
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.user.role, 'guide');
    assert.equal(response.body.data.user.passwordHash, undefined);
  });

  await test('students cannot provision accounts', async () => {
    await createUser({
      fullName: 'Plain Student',
      email: 'plain.student@test.com',
      role: 'student',
    });
    const studentToken = await loginAs(app, 'plain.student@test.com');

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        fullName: 'Another Admin',
        email: 'another.admin@test.com',
        password: TEST_PASSWORD,
        role: 'admin',
      });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('the user directory is restricted to administrators', async () => {
    await createUser({
      fullName: 'Directory Student',
      email: 'directory.student@test.com',
      role: 'student',
    });
    const studentToken = await loginAs(app, 'directory.student@test.com');

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(response.status, 403);
  });

  await test('disabling an account revokes its live sessions', async () => {
    await createUser({
      fullName: 'Root Admin Two',
      email: 'root.admin.two@test.com',
      role: 'admin',
    });
    await createUser({
      fullName: 'Target Student',
      email: 'target.student@test.com',
      role: 'student',
    });

    const adminToken = await loginAs(app, 'root.admin.two@test.com');
    const studentToken = await loginAs(app, 'target.student@test.com');

    const directory = await request(app)
      .get('/api/v1/users?role=student')
      .set('Authorization', `Bearer ${adminToken}`);
    const target = directory.body.data.users.find(
      (user) => user.email === 'target.student@test.com',
    );
    assert.ok(target, 'expected the student in the directory');

    const disableResponse = await request(app)
      .patch(`/api/v1/users/${target.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'disabled' });

    assert.equal(disableResponse.status, 200);
    assert.equal(disableResponse.body.data.user.status, 'disabled');

    const afterDisable = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(afterDisable.status, 403);
    assert.equal(afterDisable.body.error.code, 'FORBIDDEN');
  });

  await test('password hashes never appear in any response', async () => {
    await createUser({
      fullName: 'Root Admin Three',
      email: 'root.admin.three@test.com',
      role: 'admin',
    });
    const adminToken = await loginAs(app, 'root.admin.three@test.com');

    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(response.status, 200);
    assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
    assert.equal(JSON.stringify(response.body).includes('TestPass123'), false);
  });
});
