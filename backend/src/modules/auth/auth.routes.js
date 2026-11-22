import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { ensureCsrfToken, requireAuth, verifyCsrf } from '../../middlewares/auth.js';
import { recordAuditLog } from '../../services/auditService.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 500 : 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Terlalu banyak percobaan masuk. Silakan tunggu beberapa menit.'
    }
  }
});

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi.'),
  password: z.string().min(1, 'Password wajib diisi.')
});

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const [rows] = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.password_hash,
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
       WHERE u.username = ?
       LIMIT 1`,
      [payload.username]
    );

    if (rows.length === 0) {
      throw AppError.unauthorized('Username atau password salah.', 'INVALID_CREDENTIALS');
    }

    const user = rows[0];
    const match = await bcrypt.compare(payload.password, user.password_hash);
    if (!match) {
      throw AppError.unauthorized('Username atau password salah.', 'INVALID_CREDENTIALS');
    }

    if (!user.is_active || !user.organization_active) {
      throw AppError.forbidden('Akun atau organisasi Anda telah dinonaktifkan.');
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    req.session.userId = user.id;
    const csrfToken = ensureCsrfToken(req);

    await recordAuditLog({
      actorId: user.id,
      organizationId: user.organization_id,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      requestId: req.requestId,
      changeSummary: `Pengguna '${user.username}' berhasil masuk ke sistem.`
    });

    return sendSuccess(res, {
      user: {
        id: Number(user.id),
        username: user.username,
        name: user.name,
        role: user.role,
        organization_id: Number(user.organization_id),
        organization_name: user.organization_name,
        organization_code: user.organization_code,
        organization_type: user.organization_type,
        parent_organization_id: user.parent_organization_id ? Number(user.parent_organization_id) : null
      },
      csrfToken
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, verifyCsrf, async (req, res, next) => {
  try {
    const user = req.user;

    await recordAuditLog({
      actorId: user.id,
      organizationId: user.organization_id,
      action: 'USER_LOGOUT',
      entityType: 'user',
      entityId: user.id,
      requestId: req.requestId,
      changeSummary: `Pengguna '${user.username}' keluar dari sistem.`
    });

    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    res.clearCookie('tumbuhpantau.sid');
    return sendSuccess(res, { loggedOut: true });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const csrfToken = ensureCsrfToken(req);
  return sendSuccess(res, {
    user: req.user,
    csrfToken
  });
});
