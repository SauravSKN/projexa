import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuditService, AUDIT_ACTIONS } from '../src/services/audit/auditService.js';
import { assertSafeSeedTarget, seedDevelopment } from '../src/seeds/seedDevelopment.js';

test('audit events are append-only inserts with allowed change field names only', async () => {
  const events = [];
  const AuditEvent = { create: async (payload) => {
    const event = Array.isArray(payload) ? payload[0] : payload;
    events.push(event);
    return Array.isArray(payload) ? [event] : event;
  } };
  const audit = createAuditService({ AuditEvent });
  await audit.record({
    actorId: 'admin', action: AUDIT_ACTIONS.TEAM_ASSIGNED,
    targetType: 'Team', targetId: 'team1',
    fieldsChanged: ['guideId', 'passwordHash', 'memberIds', 'authorization', 'guideId'],
  });
  assert.equal(events.length, 1);
  assert.deepEqual(events[0].changeSummary, { fieldsChanged: ['guideId', 'memberIds'] });
  assert.equal(JSON.stringify(events).includes('passwordHash'), false);
  await assert.rejects(audit.record({ actorId: 'x', targetId: 'y', action: 'INVALID', targetType: 'Team' }), TypeError);
});

test('audit service forwards MongoDB session for transactional caller', async () => {
  let options;
  const AuditEvent = { create: async (payload, suppliedOptions) => { options = suppliedOptions; return payload; } };
  await createAuditService({ AuditEvent }).record({
    actorId: 'a', targetId: 't', action: 'PROJECT_CREATED', targetType: 'Project',
    session: { testSession: true },
  });
  assert.equal(options.session.testSession, true);
});

test('seed guard refuses production, unsafe databases, and missing private password', () => {
  const good = { nodeEnv: 'development', dbName: 'projexa_dev', allowSeed: 'true', password: 'temporary-secret-123' };
  assert.doesNotThrow(() => assertSafeSeedTarget(good));
  assert.throws(() => assertSafeSeedTarget({ ...good, nodeEnv: 'production' }));
  assert.throws(() => assertSafeSeedTarget({ ...good, dbName: 'projexa' }));
  assert.throws(() => assertSafeSeedTarget({ ...good, allowSeed: undefined }));
  assert.throws(() => assertSafeSeedTarget({ ...good, password: 'short' }));
});

function seedModel() {
  const rows = [];
  return {
    rows,
    async findOneAndUpdate(query, update) {
      let found = rows.find((row) => Object.entries(query).every(([key, value]) => String(row[key]) === String(value)));
      if (!found) {
        found = { ...update.$setOnInsert, _id: `fixture${rows.length + 1}` };
        rows.push(found);
      }
      return found;
    },
  };
}

test('seed inserts valid team and project once, while leaving repeated runs unchanged', async () => {
  const models = { User: seedModel(), Team: seedModel(), Project: seedModel() };
  const options = {
    ...models, hashPassword: async () => 'hashed-through-BE1',
    nodeEnv: 'development', allowSeed: 'true', dbName: 'projexa_test',
    password: 'temporary-secret-123',
  };
  const first = await seedDevelopment(options);
  await seedDevelopment(options);
  assert.equal(models.User.rows.length, 8);
  assert.equal(models.Team.rows.length, 1);
  assert.equal(models.Project.rows.length, 1);
  assert.equal(first.team.memberIds.length, 4);
  assert.equal(first.team.guideId, first.users.guideA._id);
  assert.equal(first.project.teamId, first.team._id);
  assert.equal(models.User.rows.some((row) => row.passwordHash === options.password), false);
});
