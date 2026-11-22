export function sendSuccess(res, data = null, statusCode = 200, extraMeta = {}) {
  const requestId = res.req?.requestId || res.locals?.requestId || null;
  const payload = {
    success: true,
    data,
    meta: {
      ...(requestId ? { requestId } : {}),
      timestamp: new Date().toISOString(),
      ...extraMeta
    }
  };
  return res.status(statusCode).json(payload);
}

export function sendError(res, { statusCode = 500, code = 'INTERNAL_ERROR', message = 'Terjadi kesalahan server.', fieldErrors = null } = {}, extraMeta = {}) {
  const requestId = res.req?.requestId || res.locals?.requestId || null;
  const error = { code, message };

  if (fieldErrors && typeof fieldErrors === 'object' && Object.keys(fieldErrors).length > 0) {
    error.fieldErrors = fieldErrors;
  }

  const payload = {
    success: false,
    error,
    meta: {
      ...(requestId ? { requestId } : {}),
      ...extraMeta
    }
  };
  return res.status(statusCode).json(payload);
}
