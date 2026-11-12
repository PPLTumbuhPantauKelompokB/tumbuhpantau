import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';

export const guardiansRouter = Router();

guardiansRouter.use(
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS)
);

function formatDateOnly(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

guardiansRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user;
    const allowedOrgIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
    if (allowedOrgIds.length === 0) {
      return sendSuccess(res, []);
    }

    const { q, organization_id } = req.query;
    let targetOrgIds = allowedOrgIds;
    if (organization_id) {
      const parsedOrgId = Number(organization_id);
      if (!allowedOrgIds.includes(parsedOrgId)) {
        throw AppError.forbidden('Anda tidak memiliki akses ke Posyandu yang dipilih.');
      }
      targetOrgIds = [parsedOrgId];
    }

    const conditions = ['g.organization_id IN (?)'];
    const params = [targetOrgIds];

    if (q && String(q).trim() !== '') {
      const searchTerm = `%${String(q).trim()}%`;
      conditions.push('(g.name LIKE ? OR g.phone LIKE ? OR g.address LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const [rows] = await pool.query(
      `SELECT
        g.id,
        g.organization_id,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        g.name,
        g.phone,
        g.address,
        g.is_active,
        g.created_at,
        (SELECT COUNT(*) FROM children c WHERE c.guardian_id = g.id AND c.inactive_on IS NULL) AS active_children_count
       FROM guardians g
       INNER JOIN organizations o ON o.id = g.organization_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY g.name ASC`,
      params
    );

    return sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

const createGuardianSchema = z.object({
  organization_id: z.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Nama wali minimal 2 karakter.').max(150),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable()
});

guardiansRouter.post('/', verifyCsrf, async (req, res, next) => {
  try {
    const payload = createGuardianSchema.parse(req.body);
    const orgId = payload.organization_id || req.user.organization_id;

    await AccessPolicy.assertPosyanduAccess(req.user, orgId);

    const [insertRes] = await pool.query(
      `INSERT INTO guardians (organization_id, name, phone, address, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [orgId, payload.name, payload.phone || null, payload.address || null]
    );

    const guardianId = Number(insertRes.insertId);

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: orgId,
      action: 'GUARDIAN_CREATED',
      entityType: 'guardian',
      entityId: guardianId,
      requestId: req.requestId,
      changeSummary: `Menambahkan data orang tua/wali baru: ${payload.name} (${payload.phone || 'tanpa no. HP'}).`
    });

    return sendSuccess(
      res,
      {
        id: guardianId,
        organization_id: orgId,
        name: payload.name,
        phone: payload.phone || null,
        address: payload.address || null,
        is_active: 1
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

guardiansRouter.get('/:id', async (req, res, next) => {
  try {
    const guardianId = Number(req.params.id);
    if (!Number.isInteger(guardianId) || guardianId <= 0) {
      throw AppError.badRequest('ID wali tidak valid.');
    }

    const [rows] = await pool.query(
      `SELECT
        g.id,
        g.organization_id,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        g.name,
        g.phone,
        g.address,
        g.is_active,
        g.created_at
       FROM guardians g
       INNER JOIN organizations o ON o.id = g.organization_id
       WHERE g.id = ?
       LIMIT 1`,
      [guardianId]
    );

    if (rows.length === 0) {
      throw AppError.notFound('Data orang tua/wali tidak ditemukan.');
    }

    const guardian = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, guardian.organization_id);

    const [childRows] = await pool.query(
      `SELECT
        c.id,
        c.internal_code,
        c.name,
        c.birth_date,
        c.sex,
        c.guardian_relationship,
        c.registered_on,
        c.inactive_on
       FROM children c
       WHERE c.guardian_id = ?
       ORDER BY c.name ASC`,
      [guardianId]
    );

    return sendSuccess(res, {
      guardian: {
        id: Number(guardian.id),
        organization_id: Number(guardian.organization_id),
        posyandu_name: guardian.posyandu_name,
        posyandu_code: guardian.posyandu_code,
        name: guardian.name,
        phone: guardian.phone || '',
        address: guardian.address || '',
        is_active: Boolean(guardian.is_active),
        created_at: guardian.created_at
      },
      children: childRows.map((c) => ({
        id: Number(c.id),
        internal_code: c.internal_code,
        name: c.name,
        birth_date: formatDateOnly(c.birth_date),
        sex: c.sex,
        guardian_relationship: c.guardian_relationship,
        is_active: c.inactive_on === null
      }))
    });
  } catch (err) {
    next(err);
  }
});

const updateGuardianSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  is_active: z.boolean().optional()
});

guardiansRouter.put('/:id', verifyCsrf, async (req, res, next) => {
  try {
    const guardianId = Number(req.params.id);
    const payload = updateGuardianSchema.parse(req.body);

    const [rows] = await pool.query('SELECT * FROM guardians WHERE id = ? LIMIT 1', [guardianId]);
    if (rows.length === 0) {
      throw AppError.notFound('Data wali tidak ditemukan.');
    }

    const g = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, g.organization_id);

    const nextName = payload.name ?? g.name;
    const nextPhone = payload.phone !== undefined ? payload.phone : g.phone;
    const nextAddress = payload.address !== undefined ? payload.address : g.address;
    const nextActive = payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : g.is_active;

    await pool.query(
      'UPDATE guardians SET name = ?, phone = ?, address = ?, is_active = ? WHERE id = ?',
      [nextName, nextPhone || null, nextAddress || null, nextActive, guardianId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(g.organization_id),
      action: 'GUARDIAN_UPDATED',
      entityType: 'guardian',
      entityId: guardianId,
      requestId: req.requestId,
      changeSummary: `Memperbarui kontak/data wali ${nextName} (#${guardianId}).`
    });

    return sendSuccess(res, { id: guardianId, updated: true });
  } catch (err) {
    next(err);
  }
});

guardiansRouter.patch('/:id', verifyCsrf, async (req, res, next) => {
  req.url = `/${req.params.id}`;
  return guardiansRouter.handle(req, res, next);
});
