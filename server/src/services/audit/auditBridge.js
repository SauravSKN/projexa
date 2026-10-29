import { ApiError } from '../../utils/ApiError.js';

/**
 * Integration point for Member 4's audit service.
 *
 * Member 4 owns `auditService.record()` and the append-only `AuditEvent`
 * schema. Backend Member 3 owns the admin mutations and therefore calls this
 * bridge. Until Member 4's module is merged into this branch the bridge is
 * inert; once it is present it is wired automatically by
 * `installMember4Audit()`.
 *
 * Audit failures are never swallowed: if a recorder is installed and the
 * write fails, the mutation is reported as failed.
 */
let recorder = null;

export function registerAuditService(service) {
  if (!service || typeof service.record !== 'function') {
    throw new TypeError('Audit service must expose a record() method');
  }
  recorder = service;
}

export function getAuditService() {
  return recorder;
}

export function resetAuditService() {
  recorder = null;
}

export async function recordAudit(event) {
  if (!recorder) return null;
  try {
    return await recorder.record(event);
  } catch (error) {
    console.error('[PROJEXA] Audit recording failed:', error.message);
    throw ApiError.internal(
      'The change could not be recorded in the audit log and was rolled back',
    );
  }
}
