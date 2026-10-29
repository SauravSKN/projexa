import 'dotenv/config';
import mongoose from 'mongoose';
import { loadConfig, isSafeDevelopmentDatabase } from '../config/env.js';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import { hashPassword } from '../services/authService.js';

/**
 * Bootstraps the first administrator account.
 *
 * Public registration can only ever create students, so the very first admin
 * has to be provisioned out of band. This CLI is that out-of-band path.
 *
 * Required environment variables:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME
 * Optional:
 *   ADMIN_ROLE (admin|guide), ALLOW_ADMIN_PROVISION=true (required in production)
 */
const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const config = loadConfig();

  if (!isSafeDevelopmentDatabase(config.mongodbUri)) {
    throw new Error(
      'Refusing to provision an account: the target database name must contain dev, test or local',
    );
  }
  if (config.isProduction && process.env.ALLOW_ADMIN_PROVISION !== 'true') {
    throw new Error(
      'Refusing to provision an account in production without ALLOW_ADMIN_PROVISION=true',
    );
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const fullName = (process.env.ADMIN_FULL_NAME || '').trim();
  const role = process.env.ADMIN_ROLE || 'admin';

  const problems = [];
  if (!email) problems.push('ADMIN_EMAIL is required');
  if (!fullName) problems.push('ADMIN_FULL_NAME is required');
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!['admin', 'guide'].includes(role)) {
    problems.push('ADMIN_ROLE must be either admin or guide');
  }
  if (problems.length > 0) {
    throw new Error(problems.join('; '));
  }

  await connectDatabase(config.mongodbUri);

  const existing = await User.findOne({ email }).select('_id role');
  if (existing) {
    console.log(
      `[PROJEXA] Account already exists for ${email} with role '${existing.role}'. Nothing to do.`,
    );
    await mongoose.connection.close();
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({
    fullName,
    email,
    passwordHash,
    role,
    status: 'active',
  });

  console.log(
    `[PROJEXA] Provisioned ${role} account ${user.email} (id ${user._id}) in database ${mongoose.connection.name}.`,
  );

  await mongoose.connection.close();
}

main().catch((error) => {
  console.error(`[PROJEXA] Admin provisioning failed: ${error.message}`);
  process.exitCode = 1;
});
