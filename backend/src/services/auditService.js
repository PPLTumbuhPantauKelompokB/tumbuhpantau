import { pool } from '../config/db.js';

export async function recordAuditLog(
  {
    actorId = null,
    organizationId = null,
    action,
    entityType,
    entityId = null,
    requestId = null,
    changeSummary
  },
  executor = pool
) {
  const safeSummary = String(changeSummary || '')
    .replace(/password|password_hash|token|secret/gi, '[REDACTED]')
    .slice(0, 500);

  await executor.query(
    `INSERT INTO audit_logs
      (actor_id, organization_id, action, entity_type, entity_id, request_id, change_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [actorId, organizationId, action, entityType, entityId, requestId, safeSummary]
  );
}
