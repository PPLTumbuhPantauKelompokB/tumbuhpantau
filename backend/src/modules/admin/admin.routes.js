import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';

export const adminRouter = Router();

adminRouter.get('/organizations', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    let querySql = `
      SELECT
        o.id,
        o.parent_id,
        p.name AS parent_name,
        o.type,
        o.code,
        o.name,
        o.is_active,
        o.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS user_count,
        (SELECT COUNT(*) FROM children c WHERE c.organization_id = o.id AND c.inactive_on IS NULL) AS active_children_count
      FROM organizations o
      LEFT JOIN organizations p ON p.id = o.parent_id
    `;
    const params = [];

    if (user.role === ROLES.PETUGAS_PUSKESMAS) {
      querySql += ` WHERE o.id = ? OR o.parent_id = ?`;
      params.push(user.organization_id, user.organization_id);
    } else if (user.role === ROLES.KADER) {
      querySql += ` WHERE o.id = ?`;
      params.push(user.organization_id);
    }

    querySql += ` ORDER BY o.type ASC, o.name ASC`;
    const [rows] = await pool.query(querySql, params);

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

const createOrgSchema = z.object({
  type: z.enum(['dinas_kesehatan', 'puskesmas', 'posyandu']),
  parent_id: z.number().int().positive().nullable().optional(),
  code: z.string().trim().min(3).max(50),
  name: z.string().trim().min(3).max(150)
});

adminRouter.post(
  '/organizations',
  requireAuth,
  requireRoles(ROLES.ADMINISTRATOR),
  verifyCsrf,
  async (req, res, next) => {
    try {
      const payload = createOrgSchema.parse(req.body);

      const [existing] = await pool.query('SELECT id FROM organizations WHERE code = ? LIMIT 1', [
        payload.code
      ]);
      if (existing.length > 0) {
        throw AppError.conflict(`Unit organisasi dengan kode '${payload.code}' sudah terdaftar.`);
      }

      const [insertRes] = await pool.query(
        `INSERT INTO organizations (type, parent_id, code, name, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [payload.type, payload.parent_id || null, payload.code, payload.name]
      );

      const orgId = Number(insertRes.insertId);

      await recordAuditLog({
        actorId: req.user.id,
        organizationId: req.user.organization_id,
        action: 'ORGANIZATION_CREATED',
        entityType: 'organization',
        entityId: orgId,
        requestId: req.requestId,
        changeSummary: `Membuat unit organisasi [${payload.code}] ${payload.name} (${payload.type}).`
      });

      return sendSuccess(res, { id: orgId, ...payload, is_active: 1 }, 201);
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.patch(
  '/organizations/:id',
  requireAuth,
  requireRoles(ROLES.ADMINISTRATOR),
  verifyCsrf,
  async (req, res, next) => {
    try {
      const orgId = Number(req.params.id);
      const updateSchema = z.object({
        name: z.string().trim().min(3).max(150).optional(),
        is_active: z.boolean().optional()
      });
      const payload = updateSchema.parse(req.body);

      const [existing] = await pool.query('SELECT * FROM organizations WHERE id = ? LIMIT 1', [
        orgId
      ]);
      if (existing.length === 0) {
        throw AppError.notFound('Organisasi tidak ditemukan.');
      }

      const org = existing[0];
      const nextName = payload.name ?? org.name;
      const nextActive = payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : org.is_active;

      await pool.query('UPDATE organizations SET name = ?, is_active = ? WHERE id = ?', [
        nextName,
        nextActive,
        orgId
      ]);

      await recordAuditLog({
        actorId: req.user.id,
        organizationId: req.user.organization_id,
        action: 'ORGANIZATION_UPDATED',
        entityType: 'organization',
        entityId: orgId,
        requestId: req.requestId,
        changeSummary: `Memperbarui organisasi #${orgId} (aktif=${nextActive}).`
      });

      return sendSuccess(res, { id: orgId, updated: true });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get('/users', requireAuth, requireRoles(ROLES.ADMINISTRATOR), async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.name,
        u.role,
        u.is_active,
        u.created_at,
        u.organization_id,
        o.name AS organization_name,
        o.code AS organization_code,
        o.type AS organization_type
      FROM users u
      INNER JOIN organizations o ON o.id = u.organization_id
      ORDER BY u.created_at DESC
    `);
    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  organization_id: z.number().int().positive(),
  name: z.string().trim().min(2).max(150),
  username: z.string().trim().min(3).max(80),
  password: z.string().min(6),
  role: z.enum(['kader', 'petugas_puskesmas', 'dinas_kesehatan', 'administrator'])
});

adminRouter.post(
  '/users',
  requireAuth,
  requireRoles(ROLES.ADMINISTRATOR),
  verifyCsrf,
  async (req, res, next) => {
    try {
      const payload = createUserSchema.parse(req.body);

      const [existing] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [
        payload.username
      ]);
      if (existing.length > 0) {
        throw AppError.conflict(`Username '${payload.username}' sudah dipakai.`);
      }

      const passwordHash = await bcrypt.hash(payload.password, 12);

      const [resInsert] = await pool.query(
        `INSERT INTO users (organization_id, name, username, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [payload.organization_id, payload.name, payload.username, passwordHash, payload.role]
      );

      const userId = Number(resInsert.insertId);

      await recordAuditLog({
        actorId: req.user.id,
        organizationId: req.user.organization_id,
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: userId,
        requestId: req.requestId,
        changeSummary: `Membuat akun pengguna '${payload.username}' role=${payload.role}.`
      });

      return sendSuccess(
        res,
        {
          id: userId,
          organization_id: payload.organization_id,
          name: payload.name,
          username: payload.username,
          role: payload.role
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.patch(
  '/users/:id',
  requireAuth,
  requireRoles(ROLES.ADMINISTRATOR),
  verifyCsrf,
  async (req, res, next) => {
    try {
      const targetUserId = Number(req.params.id);
      const updateSchema = z.object({
        name: z.string().trim().min(2).max(150).optional(),
        password: z.string().min(6).optional(),
        is_active: z.boolean().optional()
      });
      const payload = updateSchema.parse(req.body);

      const [existing] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [
        targetUserId
      ]);
      if (existing.length === 0) {
        throw AppError.notFound('Pengguna tidak ditemukan.');
      }

      const user = existing[0];
      const nextName = payload.name ?? user.name;
      const nextActive = payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : user.is_active;

      if (payload.password) {
        const hash = await bcrypt.hash(payload.password, 12);
        await pool.query(
          'UPDATE users SET name = ?, password_hash = ?, is_active = ? WHERE id = ?',
          [nextName, hash, nextActive, targetUserId]
        );
      } else {
        await pool.query('UPDATE users SET name = ?, is_active = ? WHERE id = ?', [
          nextName,
          nextActive,
          targetUserId
        ]);
      }

      await recordAuditLog({
        actorId: req.user.id,
        organizationId: req.user.organization_id,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: targetUserId,
        requestId: req.requestId,
        changeSummary: `Memperbarui akun '${user.username}' (aktif=${nextActive}).`
      });

      return sendSuccess(res, { id: targetUserId, updated: true });
    } catch (err) {
      next(err);
    }
  }
);

adminRouter.get(
  '/audit-logs',
  requireAuth,
  requireRoles(ROLES.ADMINISTRATOR, ROLES.PETUGAS_PUSKESMAS),
  async (req, res, next) => {
    try {
      const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
      const actionFilter = req.query.action ? String(req.query.action) : null;

      let sql = `
        SELECT
          a.id,
          a.occurred_at,
          a.action,
          a.entity_type,
          a.entity_id,
          a.request_id,
          a.change_summary,
          u.name AS actor_name,
          u.username AS actor_username,
          o.name AS organization_name
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_id
        LEFT JOIN organizations o ON o.id = a.organization_id
      `;
      const params = [];

      if (req.user.role === ROLES.PETUGAS_PUSKESMAS) {
        sql += ` WHERE (a.organization_id = ? OR a.organization_id IN (
          SELECT id FROM organizations WHERE parent_id = ?
        ))`;
        params.push(req.user.organization_id, req.user.organization_id);
      }

      if (actionFilter) {
        sql += (params.length > 0 ? ' AND ' : ' WHERE ') + ` a.action = ?`;
        params.push(actionFilter);
      }

      sql += ` ORDER BY a.occurred_at DESC LIMIT ?`;
      params.push(limit);

      const [rows] = await pool.query(sql, params);
      return sendSuccess(res, rows);
    } catch (err) {
      next(err);
    }
  }
);
