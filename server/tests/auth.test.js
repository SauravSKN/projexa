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

test('authentication endpoints', async (t) => {
  const config = await setupTestDatabase();
  const app = buildTestApp(config);

  t.after(async () => {
    await teardownTestDatabase();
  });

  await test('valid login succeeds and returns a token without secrets', async () => {
    await createUser({
      fullName: 'Test Student',
      email: 'student1@test.com',
      role: 'student',
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student1@test.com', password: TEST_PASSWORD });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data.token, 'string');
    assert.equal(response.body.data.user.email, 'student1@test.com');
    assert.equal(response.body.data.user.role, 'student');
    assert.equal(response.body.data.user.passwordHash, undefined);
    assert.equal(JSON.stringify(response.body).includes('passwordHash'), false);
  });

  await test('login sets an http-only session cookie', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student1@test.com', password: TEST_PASSWORD });

    const cookies = response.headers['set-cookie'] || [];
    const tokenCookie = cookies.find((cookie) => cookie.startsWith('projexa_token='));
    assert.ok(tokenCookie, 'expected a projexa_token cookie');
    assert.match(tokenCookie, /HttpOnly/i);
  });

  await test('invalid password is rejected with 401', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student1@test.com', password: 'WrongPassword123' });

    assert.equal(response.status, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  });

  await test('unknown email is rejected with 401', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: TEST_PASSWORD });

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  });

  await test('missing credentials are rejected with 400', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({});

    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  });

  await test('disabled accounts cannot log in', async () => {
    await createUser({
      fullName: 'Disabled Student',
      email: 'disabled@test.com',
      role: 'student',
      status: 'disabled',
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'disabled@test.com', password: TEST_PASSWORD });

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('protected /auth/me rejects requests without a token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, 'UNAUTHENTICATED');
  });

  await test('protected /auth/me returns the authenticated profile', async () => {
    const token = await loginAs(app, 'student1@test.com');

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.email, 'student1@test.com');
    assert.equal(response.body.data.user.passwordHash, undefined);
  });

  await test('logout genuinely invalidates the session token', async () => {
    const token = await loginAs(app, 'student1@test.com');

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(logoutResponse.status, 200);
    assert.equal(logoutResponse.body.success, true);

    const afterLogout = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(afterLogout.status, 401);
    assert.equal(afterLogout.body.error.code, 'UNAUTHENTICATED');
  });

  await test('registration creates a student account and returns 201', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'New Student',
        email: 'new.student@test.com',
        password: TEST_PASSWORD,
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.role, 'student');
    assert.equal(response.body.data.user.email, 'new.student@test.com');
    assert.equal(typeof response.body.data.token, 'string');
  });

  await test('duplicate registration is rejected with 409', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'New Student',
        email: 'new.student@test.com',
        password: TEST_PASSWORD,
      });

    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, 'CONFLICT');
  });
});
