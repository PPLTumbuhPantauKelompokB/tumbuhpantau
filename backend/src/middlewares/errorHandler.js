import { AppError } from '../lib/AppError.js';
import { sendError } from '../lib/respond.js';
import { recordAuditLog } from '../services/auditService.js';

export function notFoundHandler(req, res) {
  return sendError(res, {
    statusCode: 404,
    code: 'NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl || req.url} tidak ditemukan.`
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    if (err.statusCode === 403 && req?.user?.id && !err._auditLogged) {
      err._auditLogged = true;
      recordAuditLog({
        actorId: req.user.id,
        organizationId: req.user.organization_id,
        action: 'ACCESS_DENIED',
        entityType: 'authorization',
        entityId: null,
        requestId: req.requestId,
        changeSummary: `Penolakan akses (${err.code}) oleh ${req.user.username} pada ${req.method} ${req.originalUrl || req.url}: ${err.message}`
      }).catch(() => {});
    }
    return sendError(res, {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      fieldErrors: err.fieldErrors
    });
  }

  if (err?.name === 'ZodError' && Array.isArray(err.issues)) {
    const fieldErrors = {};
    for (const issue of err.issues) {
      const field = issue.path.length > 0 ? issue.path.join('.') : 'root';
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return sendError(res, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Data yang dikirim tidak valid.',
      fieldErrors
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, {
      statusCode: 400,
      code: 'INVALID_JSON',
      message: 'Format payload JSON tidak valid.'
    });
  }

  if (err?.statusCode === 429 || err?.status === 429) {
    return sendError(res, {
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: err.message || 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.'
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${req.requestId || 'no-req-id'}] Unexpected error:`, err?.name || 'Error', err?.message || '');
  }

  return sendError(res, {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan server.'
  });
}
