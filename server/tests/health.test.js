import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('GET /api/health returns 200 with standard health data envelope', async () => {
  const app = createApp();
  const res = await request(app).get('/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'healthy');
  assert.equal(res.body.data.service, 'projexa-backend');
  assert.equal(typeof res.body.data.timestamp, 'string');
  assert.equal(typeof res.body.data.uptime, 'number');
});

test('GET /api/v1/health returns 200 with matching envelope', async () => {
  const app = createApp();
  const res = await request(app).get('/api/v1/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.status, 'healthy');
});

test('Unknown route returns 404 with standard error envelope', async () => {
  const app = createApp();
  const res = await request(app).get('/api/unknown-endpoint');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
