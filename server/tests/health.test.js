import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  buildTestApp,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers/testContext.js';

test('GET /api/health returns 200 with standard health data envelope', async () => {
  const app = buildTestApp();
  const res = await request(app).get('/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.service, 'projexa-backend');
  assert.equal(typeof res.body.data.timestamp, 'string');
  assert.equal(typeof res.body.data.uptime, 'number');
  assert.ok(['healthy', 'degraded'].includes(res.body.data.status));
  assert.ok(['connected', 'disconnected'].includes(res.body.data.database));
});

test('GET /api/v1/health returns 200 with matching envelope', async () => {
  const app = buildTestApp();
  const res = await request(app).get('/api/v1/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('Unknown route returns 404 with standard error envelope', async () => {
  const app = buildTestApp();
  const res = await request(app).get('/api/unknown-endpoint');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('Readiness probe reports the real database availability', async (t) => {
  const config = await setupTestDatabase();
  const app = buildTestApp(config);

  t.after(async () => {
    await teardownTestDatabase();
  });

  const ready = await request(app).get('/api/health/ready');
  assert.equal(ready.status, 200);
  assert.equal(ready.body.success, true);
  assert.equal(ready.body.data.status, 'ready');

  const health = await request(app).get('/api/health');
  assert.equal(health.body.data.status, 'healthy');
  assert.equal(health.body.data.database, 'connected');
});
