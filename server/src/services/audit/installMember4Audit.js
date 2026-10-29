import { registerAuditService } from './auditBridge.js';

/**
 * Installs Member 4's audit service when their module is available in this
 * working tree. The import is dynamic on purpose: before the Member 4 pull
 * request is merged the files do not exist and the bridge simply stays inert.
 */
export async function installMember4Audit({ mongoose }) {
  let auditServiceModule;
  let auditSchemaModule;

  try {
    [auditServiceModule, auditSchemaModule] = await Promise.all([
      import('./auditService.js'),
      import('./auditEventSchema.js'),
    ]);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      return {
        installed: false,
        reason: "Member 4's audit module is not present on this branch yet",
      };
    }
    throw error;
  }

  const AuditEvent = auditSchemaModule.registerAuditEventModel(mongoose);
  const service = auditServiceModule.createAuditService({ AuditEvent });
  registerAuditService(service);

  return { installed: true, AuditEvent, service };
}

export default installMember4Audit;
