import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTestApp,
  cookieHeader,
  createUser,
  extractCookie,
  request,
  setupTestDatabase,
  teardownTestDatabase,
  TEST_PASSWORD,
} from './helpers/testContext.js';

test('CSRF protection for cookie authenticated mutations', async (t) => {
  const config = await setupTestDatabase();
  const app = buildTestApp(config);

  t.after(async () => {
    await teardownTestDatabase();
  });

  await createUser({
    fullName: 'Cookie Student',
    email: 'cookie.student@test.com',
    role: 'student',
  });

  const login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'cookie.student@test.com', password: TEST_PASSWORD });

  assert.equal(login.status, 200);

  const cookie = cookieHeader(login);
  const csrfToken = login.body.data.csrfToken;
  assert.ok(csrfToken, 'expected a csrf token in the login response');
  assert.equal(extractCookie(login, 'projexa_csrf'), csrfToken);

  await test('a cookie authenticated mutation without a CSRF header is rejected', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie);

    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'FORBIDDEN');
  });

  await test('a cookie authenticated mutation with a wrong CSRF token is rejected', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', 'not-the-right-token');

    assert.equal(response.status, 403);
  });

  await test('a cookie authenticated mutation with the correct CSRF token succeeds', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('X-CSRF-Token', csrfToken);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
  });

  await test('bearer authenticated mutations do not require a CSRF token', async () => {
    const secondLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cookie.student@test.com', password: TEST_PASSWORD });

    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${secondLogin.body.data.token}`);

    assert.equal(response.status, 200);
  });
});
