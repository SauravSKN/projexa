/**
 * Centralised, validated runtime configuration.
 *
 * Rules:
 * - Secrets are never logged or returned by this module.
 * - Production refuses to boot without a strong JWT secret.
 * - Development/test fall back to an explicit insecure placeholder so the
 *   project stays runnable locally without shipping real credentials.
 */

const DEVELOPMENT_FALLBACK_SECRET =
  'projexa-development-only-insecure-secret-change-me';

const MIN_PRODUCTION_SECRET_LENGTH = 32;
const MIN_DEVELOPMENT_SECRET_LENGTH = 16;

function parseOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const rawSecret = env.JWT_SECRET || env.SESSION_SECRET || '';
  const jwtSecret = rawSecret || DEVELOPMENT_FALLBACK_SECRET;

  const sessionTtlMinutes = parsePositiveInt(env.SESSION_TTL_MINUTES, 60);
  const problems = [];

  if (!env.MONGODB_URI) {
    problems.push('MONGODB_URI is not set');
  }
  if (!rawSecret) {
    problems.push('JWT_SECRET (or SESSION_SECRET) is not set');
  } else if (isProduction && rawSecret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  } else if (!isProduction && rawSecret.length < MIN_DEVELOPMENT_SECRET_LENGTH) {
    problems.push(
      `JWT_SECRET must be at least ${MIN_DEVELOPMENT_SECRET_LENGTH} characters outside production`,
    );
  }
  if (env.CLIENT_ORIGIN && env.CLIENT_URL && env.CLIENT_ORIGIN !== env.CLIENT_URL) {
    problems.push('CLIENT_ORIGIN and CLIENT_URL disagree; keep only CLIENT_ORIGIN');
  }

  if (problems.length > 0 && isProduction) {
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }

  return Object.freeze({
    nodeEnv,
    isProduction,
    isTest,
    port: parsePositiveInt(env.PORT, 5000),
    apiPrefix: env.API_PREFIX || '/api/v1',
    mongodbUri: env.MONGODB_URI || 'mongodb://localhost:27017/projexa_dev',
    mongodbTestUri:
      env.MONGODB_URI_TEST || 'mongodb://localhost:27017/projexa_test',
    jwtSecret,
    jwtSecretProvided: Boolean(rawSecret),
    sessionTtlMinutes,
    sessionTtlSeconds: sessionTtlMinutes * 60,
    tokenExpiresIn: `${sessionTtlMinutes}m`,
    clientOrigins: parseOrigins(env.CLIENT_ORIGIN || env.CLIENT_URL),
    cookieSecure: isProduction || env.COOKIE_SECURE === 'true',
    trustProxy: env.TRUST_PROXY === 'true',
    allowDevSeed: env.ALLOW_DEV_SEED === 'true',
    seedDemoPassword: env.SEED_DEMO_PASSWORD || '',
    configurationProblems: Object.freeze(problems),
  });
}

/** Extracts the database name from a MongoDB URI without exposing credentials. */
export function databaseNameFromUri(uri) {
  if (!uri) return null;
  const withoutQuery = String(uri).split('?')[0];
  const segments = withoutQuery.split('/');
  const name = segments[segments.length - 1];
  return name || null;
}

/**
 * Safety guard shared by seed and provisioning scripts: the target database
 * name must explicitly look like a development/test database.
 */
export function isSafeDevelopmentDatabase(uri) {
  const name = databaseNameFromUri(uri);
  if (!name) return false;
  return /(^|[_-])(dev|test|local)([_-]|$)/i.test(name);
}
