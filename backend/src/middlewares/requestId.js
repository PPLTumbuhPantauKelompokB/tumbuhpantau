import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = req.header('x-request-id');
  const validIncoming = typeof incoming === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(incoming);
  const id = validIncoming ? incoming : randomUUID();

  req.requestId = id;
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);

  next();
}
