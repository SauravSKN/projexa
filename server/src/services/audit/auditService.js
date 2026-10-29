export const AUDIT_ACTIONS = Object.freeze({
  TEAM_CREATED: 'TEAM_CREATED',
  TEAM_UPDATED: 'TEAM_UPDATED',
  TEAM_ASSIGNED: 'TEAM_ASSIGNED',
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_ASSIGNED: 'PROJECT_ASSIGNED',
});

// Only field names, never full before/after values, appear in audit summaries.
const SAFE_FIELDS = new Set([
  'name', 'session', 'status', 'memberIds', 'guideId', 'teamId',
  'title', 'description', 'startDate', 'targetDate',
]);

export function createAuditService({ AuditEvent }) {
  if (!AuditEvent) throw new TypeError('AuditEvent model is required');

  return {
    async record({ actorId, action, targetType, targetId, fieldsChanged = [], session }) {
      if (!actorId || !targetId) throw new TypeError('Audit actor and target are required');
      if (!Object.values(AUDIT_ACTIONS).includes(action)) throw new TypeError('Unknown audit action');
      if (!['Team', 'Project'].includes(targetType)) throw new TypeError('Unknown audit target');
      if (!action.startsWith(targetType.toUpperCase())) throw new TypeError('Audit action/target mismatch');
      if (!Array.isArray(fieldsChanged)) throw new TypeError('fieldsChanged must be a list');
      const safeFields = [...new Set(fieldsChanged.filter((field) => SAFE_FIELDS.has(field)))].slice(0, 20);
      const payload = {
        actorId, action, targetType, targetId,
        timestamp: new Date(),
        changeSummary: { fieldsChanged: safeFields },
      };
      // Pass a transaction session when the caller's admin mutation uses one.
      if (session) {
        const [event] = await AuditEvent.create([payload], { session });
        return event;
      }
      return AuditEvent.create(payload);
    },
  };
}
