import { randomBytes } from 'node:crypto';
import session from 'express-session';
import expressMysqlSession from 'express-mysql-session';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { AppError } from '../lib/AppError.js';
import { AccessPolicy } from '../policies/AccessPolicy.js';

const MySQLStore = expressMysqlSession(session);

export function createSessionMiddleware({ useMemoryStore = false } = {}) {
  const store = useMemoryStore
    ? new session.MemoryStore()
    : new MySQLStore(
        {
          clearExpired: !env.isTest,
          checkExpirationInterval: 900000,
          expiration: env.session.idleMinutes * 60 * 1000,
          createDatabaseTable: true
        },
        pool
      );

  if (store && store._expirationInterval && typeof store._expirationInterval.unref === 'function') {
    store._expirationInterval.unref();
  }

  return session({
    name: 'tumbuhpantau.sid',
    secret: env.session.secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction,
      maxAge: env.session.idleMinutes * 60 * 1000
    }
  });
}

export function ensureCsrfToken(req) {
  if (req.session && !req.session.csrfToken) {
    req.session.csrfToken = randomBytes(24).toString('hex');
  }
  return req.session?.csrfToken || null;
}

export async function requireAuth(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      throw AppError.unauthorized('Silakan masuk terlebih dahulu.');
    }

    const [rows] = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.name,
        u.role,
        u.is_active,
        u.organization_id,
        o.name AS organization_name,
        o.code AS organization_code,
        o.type AS organization_type,
        o.parent_id AS parent_organization_id,
        o.is_active AS organization_active
       FROM users u
       INNER JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      req.session.destroy(() => {});
      throw AppError.unauthorized('Akun pengguna tidak ditemukan.');
    }

    const user = rows[0];
    if (!user.is_active || !user.organization_active) {
      req.session.destroy(() => {});
      throw AppError.forbidden('Akun atau unit organisasi Anda telah dinonaktifkan.');
    }

    req.user = {
      id: Number(user.id),
      username: user.username,
      name: user.name,
      role: user.role,
      organization_id: Number(user.organization_id),
      organization_name: user.organization_name,
      organization_code: user.organization_code,
      organization_type: user.organization_type,
      parent_organization_id: user.parent_organization_id ? Number(user.parent_organization_id) : null
    };

    const csrfToken = ensureCsrfToken(req);
    if (csrfToken) {
      res.setHeader('X-CSRF-Token', csrfToken);
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    try {
      AccessPolicy.assertRoles(req.user, allowedRoles);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function verifyCsrf(req, _res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next();
  }

  const expected = req.session?.csrfToken;
  const provided = req.header('x-csrf-token');

  if (!expected || !provided || provided !== expected) {
    return next(
      new AppError(
        'Token keamanan sesi (CSRF) tidak valid atau kedaluwarsa. Muat ulang halaman.',
        403,
        'CSRF_INVALID'
      )
    );
  }

  return next();
}
