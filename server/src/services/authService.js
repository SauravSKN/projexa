import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { ApiError } from '../utils/ApiError.js';

const GENERIC_INVALID_CREDENTIALS = 'Invalid email or password';

export function hashToken(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

export function hashPassword(plainPassword) {
  return User.hashPassword(plainPassword);
}

/**
 * Registers a public account. The role is *always* `student`; privileged
 * roles can only be granted by an authenticated administrator.
 */
export async function registerPublicUser({ fullName, email, password }) {
  const existing = await User.findOne({ email }).select('_id');
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: 'student',
      status: 'active',
    });
    return user;
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('An account with that email already exists');
    }
    throw error;
  }
}

/** Administrator-only account creation (students, guides and admins). */
export async function createUserByAdmin({ fullName, email, password, role }) {
  const existing = await User.findOne({ email }).select('_id');
  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await hashPassword(password);

  try {
    return await User.create({
      fullName,
      email,
      passwordHash,
      role,
      status: 'active',
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('An account with that email already exists');
    }
    throw error;
  }
}

/** Verifies credentials and issues a revocable server-side session. */
export async function login({ email, password, config, context = {} }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Always run a hash comparison so a missing account and a wrong password
  // take a comparable amount of time.
  const storedHash = user?.passwordHash || '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const isMatch = await bcrypt.compare(password, storedHash);

  if (!user || !isMatch) {
    throw ApiError.unauthorized(GENERIC_INVALID_CREDENTIALS);
  }
  if (user.status !== 'active') {
    throw ApiError.forbidden('Account is disabled');
  }

  const { token, csrfToken, session } = await issueSession({
    user,
    config,
    context,
  });

  return { token, csrfToken, session, user };
}

/** Creates a session document and signs a JWT bound to that session. */
export async function issueSession({ user, config, context = {} }) {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const sessionId = new mongoose.Types.ObjectId();

  const token = jwt.sign(
    { id: user._id.toString(), sid: sessionId.toString() },
    config.jwtSecret,
    { expiresIn: config.tokenExpiresIn },
  );

  const session = await Session.create({
    _id: sessionId,
    userId: user._id,
    tokenHash: hashToken(token),
    csrfTokenHash: hashToken(csrfToken),
    expiresAt: new Date(Date.now() + config.sessionTtlSeconds * 1000),
    userAgent: context.userAgent || '',
    ip: context.ip || '',
  });

  return { token, csrfToken, session };
}

/**
 * Validates a session token: signature, expiry, server-side revocation and
 * the live account status are all checked on every request.
 */
export async function verifySessionToken(token, config) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session token has expired');
    }
    throw ApiError.unauthorized('Invalid session token');
  }

  if (!payload?.sid || !payload?.id) {
    throw ApiError.unauthorized('Invalid session token');
  }

  // The account state is checked before the session state so a disabled
  // account always reports FORBIDDEN, as required by the shared contract.
  const user = await User.findById(payload.id);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists');
  }
  if (user.status !== 'active') {
    throw ApiError.forbidden('Account is disabled');
  }

  const session = await Session.findById(payload.sid);
  if (!session) {
    throw ApiError.unauthorized('Session is no longer active');
  }
  if (session.revokedAt) {
    throw ApiError.unauthorized('Session has been revoked');
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unauthorized('Session has expired');
  }
  if (session.tokenHash !== hashToken(token)) {
    throw ApiError.unauthorized('Invalid session token');
  }

  return { user, session };
}

/** Revokes a session. This is what makes logout genuinely effective. */
export async function revokeSession(session) {
  if (!session || session.revokedAt) return session;
  session.revokedAt = new Date();
  await session.save();
  return session;
}

/** Revokes every active session of a user (used when an account is disabled). */
export async function revokeAllSessionsForUser(userId) {
  return Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

/** Lists users for the administrator directory endpoint. */
export async function listUsers({ role, status, limit = 50, offset = 0 }) {
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((user) => user.toSafeObject()),
    total,
    limit,
    offset,
  };
}

/** Enables or disables an account and revokes its live sessions. */
export async function setUserStatus({ userId, status }) {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  user.status = status;
  await user.save();

  if (status === 'disabled') {
    await revokeAllSessionsForUser(user._id);
  }

  return user;
}
