import mongoose from 'mongoose';
import request from 'supertest';
import { loadConfig, databaseNameFromUri } from '../../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.js';
import Team from '../../src/models/Team.js';
import Project from '../../src/models/Project.js';
import Session from '../../src/models/Session.js';

export const TEST_JWT_SECRET = 'projexa-test-secret-value-at-least-32-characters-long';
export const TEST_PASSWORD = 'TestPass123';

const DEFAULT_TEST_URI = 'mongodb://localhost:27017/projexa_test';

function assertSafeTestDatabase(uri) {
  const name = databaseNameFromUri(uri);
  if (!name || !/(^|[_-])(test|dev|local)([_-]|$)/i.test(name)) {
    throw new Error(
      `Refusing to run the test suite against a non-test database: ${name || 'unknown'}`,
    );
  }
}

/** Builds a deterministic configuration for the test environment. */
export function buildTestConfig(overrides = {}) {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.SESSION_SECRET = TEST_JWT_SECRET;
  process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || DEFAULT_TEST_URI;
  process.env.MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || DEFAULT_TEST_URI;
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';
  process.env.COOKIE_SECURE = 'false';

  const config = loadConfig();
  return Object.freeze({ ...config, ...overrides });
}

export async function setupTestDatabase() {
  const config = buildTestConfig();
  assertSafeTestDatabase(config.mongodbUri);
  await connectDatabase(config.mongodbUri);
  await mongoose.connection.dropDatabase();
  return config;
}

export async function teardownTestDatabase() {
  await mongoose.connection.dropDatabase();
  await disconnectDatabase();
}

export function buildTestApp(config = buildTestConfig()) {
  return createApp({ config });
}

/** Creates a user with a properly hashed password. */
export async function createUser({
  fullName,
  email,
  password = TEST_PASSWORD,
  role = 'student',
  status = 'active',
}) {
  const passwordHash = await User.hashPassword(password);
  return User.create({ fullName, email, passwordHash, role, status });
}

/** Creates a finalized team with the given student members and guide. */
export async function createTeamRecord({
  name,
  session = '2026-27',
  memberIds = [],
  guideId = null,
  createdBy,
  status = 'finalized',
}) {
  return Team.create({
    name,
    session,
    memberIds,
    guideId,
    createdBy,
    status,
  });
}

/** Creates a project attached to a team. */
export async function createProjectRecord({ title, teamId, createdBy, status = 'active' }) {
  return Project.create({ title, teamId, createdBy, status });
}

/** Logs in and returns the bearer token. */
export async function loginAs(app, email, password = TEST_PASSWORD) {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  if (response.status !== 200) {
    throw new Error(
      `Login failed for ${email}: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
  return response.body.data.token;
}

/** Extracts a single cookie value from a response. */
export function extractCookie(response, name) {
  const cookies = response.headers['set-cookie'] || [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(';');
    const separator = pair.indexOf('=');
    if (separator < 0) continue;
    if (pair.slice(0, separator).trim() === name) {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
  }
  return null;
}

/** Builds a Cookie header from a response's set-cookie list. */
export function cookieHeader(response) {
  const cookies = response.headers['set-cookie'] || [];
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
}

export { mongoose, request, User, Team, Project, Session };
