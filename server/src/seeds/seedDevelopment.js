/** Deterministic, insert-only demo fixtures. Import this from BE1's seed CLI. */

export const DEMO_USERS = Object.freeze([
  { key: 'admin', fullName: 'Demo Admin', email: 'admin@demo.projexa.invalid', role: 'admin' },
  { key: 'guideA', fullName: 'Dr Ananya Shah', email: 'guide.a@demo.projexa.invalid', role: 'guide' },
  { key: 'guideB', fullName: 'Dr Rohan Mehta', email: 'guide.b@demo.projexa.invalid', role: 'guide' },
  { key: 'studentA', fullName: 'Aarav Patel', email: 'student.a@demo.projexa.invalid', role: 'student' },
  { key: 'studentB', fullName: 'Diya Rao', email: 'student.b@demo.projexa.invalid', role: 'student' },
  { key: 'studentC', fullName: 'Ishaan Das', email: 'student.c@demo.projexa.invalid', role: 'student' },
  { key: 'studentD', fullName: 'Meera Nair', email: 'student.d@demo.projexa.invalid', role: 'student' },
  { key: 'unassigned', fullName: 'Kabir Sen', email: 'unassigned@demo.projexa.invalid', role: 'student' },
]);

export function assertSafeSeedTarget({ nodeEnv, dbName, allowSeed, password }) {
  if (nodeEnv === 'production' || allowSeed !== 'true') {
    throw new Error('Development seeding is disabled for this environment');
  }
  if (!/(^|[_-])(dev|test|local)([_-]|$)/i.test(dbName ?? '')) {
    throw new Error('Database name must explicitly contain dev, test or local');
  }
  if (typeof password !== 'string' || password.length < 12) {
    throw new Error('SEED_DEMO_PASSWORD must have at least 12 characters');
  }
}

export async function seedDevelopment({
  User, Team, Project, hashPassword,
  nodeEnv = process.env.NODE_ENV,
  allowSeed = process.env.ALLOW_DEV_SEED,
  password = process.env.SEED_DEMO_PASSWORD || 'DevSecretPassword123!',
  dbName,
}) {
  assertSafeSeedTarget({ nodeEnv, allowSeed, password, dbName });
  if (!User || !Team || !Project) {
    throw new TypeError('BE1 models are required');
  }

  const passwordHash = typeof hashPassword === 'function' ? await hashPassword(password) : 'dev_hash_' + password;
  const users = {};
  for (const fixture of DEMO_USERS) {
    const { key, ...identity } = fixture;
    const user = await User.findOneAndUpdate(
      { email: identity.email },
      { $setOnInsert: { ...identity, status: 'active', passwordHash } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (user.role !== identity.role) throw new Error(`Fixture email has unexpected role: ${identity.email}`);
    users[key] = user;
  }

  const memberIds = [users.studentA, users.studentB, users.studentC, users.studentD].map((user) => user._id);
  const team = await Team.findOneAndUpdate(
    { name: 'Projexa Demo Team', session: '2026-27' },
    { $setOnInsert: {
      name: 'Projexa Demo Team', session: '2026-27', memberIds,
      guideId: users.guideA._id, createdBy: users.admin._id, status: 'finalized',
    } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  const project = await Project.findOneAndUpdate(
    { teamId: team._id },
    { $setOnInsert: {
      teamId: team._id, title: 'Projexa Demo Capstone',
      description: 'Development-only academic project fixture',
      startDate: new Date('2026-10-01T00:00:00Z'),
      targetDate: new Date('2026-12-31T00:00:00Z'),
      status: 'active', createdBy: users.admin._id,
    } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return { users, team, project };
}
