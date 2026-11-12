import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';

export const childrenRouter = Router();

childrenRouter.use(
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

function calculateAgeDays(birthDateStr, referenceDateStr) {
  const b = new Date(`${birthDateStr}T00:00:00Z`);
  const r = new Date(`${referenceDateStr}T00:00:00Z`);
  const diffTime = r.getTime() - b.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

async function generateNextInternalCode(connection, organizationId) {
  const [orgRows] = await connection.query(
    'SELECT code FROM organizations WHERE id = ? LIMIT 1',
    [organizationId]
  );
  if (orgRows.length === 0) {
    throw AppError.notFound('Unit organisasi Posyandu tidak ditemukan.');
  }

  const orgCode = orgRows[0].code;
  const [countRows] = await connection.query(
    'SELECT COUNT(*) AS cnt FROM children WHERE organization_id = ?',
    [organizationId]
  );
  const nextSeq = (Number(countRows[0]?.cnt) || 0) + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const candidateCode = `${orgCode}-${seqStr}`;

  const [existing] = await connection.query(
    'SELECT id FROM children WHERE internal_code = ? LIMIT 1',
    [candidateCode]
  );
  if (existing.length === 0) {
    return candidateCode;
  }
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${orgCode}-${seqStr}-${suffix}`;
}

childrenRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user;
    const allowedOrgIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
    if (allowedOrgIds.length === 0) {
      return sendSuccess(res, []);
    }

    const { q, status = 'active', organization_id } = req.query;

    let targetOrgIds = allowedOrgIds;
    if (organization_id) {
      const parsedOrgId = Number(organization_id);
      if (!allowedOrgIds.includes(parsedOrgId)) {
        throw AppError.forbidden('Anda tidak memiliki akses ke unit Posyandu yang dipilih.');
      }
      targetOrgIds = [parsedOrgId];
    }

    const conditions = ['c.organization_id IN (?)'];
    const params = [targetOrgIds];

    if (status === 'active') {
      conditions.push('c.inactive_on IS NULL');
    } else if (status === 'inactive') {
      conditions.push('c.inactive_on IS NOT NULL');
    }

    if (q && String(q).trim() !== '') {
      const searchTerm = `%${String(q).trim()}%`;
      conditions.push('(c.name LIKE ? OR c.internal_code LIKE ? OR g.name LIKE ?)');
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const querySql = `
      SELECT
        c.id,
        c.organization_id,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        c.guardian_id,
        g.name AS guardian_name,
        g.phone AS guardian_phone,
        c.guardian_relationship,
        c.internal_code,
        c.name,
        c.birth_date,
        c.sex,
        c.registered_on,
        c.inactive_on,
        (SELECT COUNT(*) FROM attendances a WHERE a.child_id = c.id) AS attendance_count
      FROM children c
      INNER JOIN organizations o ON o.id = c.organization_id
      LEFT JOIN guardians g ON g.id = c.guardian_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.name ASC
    `;

    const [rows] = await pool.query(querySql, params);
    const todayStr = new Date().toISOString().slice(0, 10);

    const result = rows.map((child) => {
      const birthDateStr = formatDateOnly(child.birth_date);
      const currentAgeDays = Math.max(0, calculateAgeDays(birthDateStr, todayStr));
      const currentAgeMonths = Number((currentAgeDays / 30.4375).toFixed(1));

      return {
        id: Number(child.id),
        organization_id: Number(child.organization_id),
        posyandu_name: child.posyandu_name,
        posyandu_code: child.posyandu_code,
        guardian_id: child.guardian_id ? Number(child.guardian_id) : null,
        guardian_name: child.guardian_name || '-',
        guardian_phone: child.guardian_phone || '',
        guardian_relationship: child.guardian_relationship,
        internal_code: child.internal_code,
        name: child.name,
        birth_date: birthDateStr,
        sex: child.sex,
        registered_on: formatDateOnly(child.registered_on),
        inactive_on: formatDateOnly(child.inactive_on),
        attendance_count: Number(child.attendance_count) || 0,
        age_days_current: currentAgeDays,
        age_months_current: currentAgeMonths,
        latest_measurement: null
      };
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

childrenRouter.get('/check-duplicate', async (req, res, next) => {
  try {
    const { name, birth_date, organization_id } = req.query;
    if (!name || !birth_date) {
      return sendSuccess(res, { duplicates: [] });
    }

    const orgId = organization_id ? Number(organization_id) : req.user.organization_id;
    await AccessPolicy.assertPosyanduAccess(req.user, orgId);

    const [rows] = await pool.query(
      `SELECT c.id, c.internal_code, c.name, c.birth_date, c.sex, g.name AS guardian_name
       FROM children c
       LEFT JOIN guardians g ON g.id = c.guardian_id
       WHERE c.organization_id = ?
         AND c.birth_date = ?
         AND LOWER(REPLACE(c.name, ' ', '')) = LOWER(REPLACE(?, ' ', ''))
       LIMIT 5`,
      [orgId, birth_date, String(name).trim()]
    );

    return sendSuccess(res, {
      duplicates: rows.map((m) => ({
        id: Number(m.id),
        internal_code: m.internal_code,
        name: m.name,
        birth_date: formatDateOnly(m.birth_date),
        sex: m.sex,
        guardian_name: m.guardian_name
      }))
    });
  } catch (err) {
    next(err);
  }
});

const createChildSchema = z.object({
  organization_id: z.number().int().positive().optional(),
  name: z.string().trim().min(2, 'Nama anak minimal 2 karakter.').max(150),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal lahir harus berformat YYYY-MM-DD.'),
  sex: z.enum(['L', 'P']),
  registered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guardian_name: z.string().trim().min(2, 'Nama orang tua/wali minimal 2 karakter.').max(150),
  guardian_phone: z.string().trim().max(40).optional().nullable(),
  guardian_relationship: z.string().trim().min(2).max(60).default('Ibu'),
  force_create: z.boolean().optional().default(false)
});

childrenRouter.post('/', verifyCsrf, async (req, res, next) => {
  try {
    const payload = createChildSchema.parse(req.body);
    const targetOrgId = payload.organization_id || req.user.organization_id;

    await AccessPolicy.assertPosyanduAccess(req.user, targetOrgId);

    const todayStr = new Date().toISOString().slice(0, 10);
    const registeredOn = payload.registered_on || todayStr;
    const ageDays = calculateAgeDays(payload.birth_date, registeredOn);

    if (ageDays < 0) {
      throw AppError.badRequest('Tanggal lahir tidak boleh berada di masa depan.');
    }
    if (ageDays >= 1826) {
      throw AppError.badRequest(
        'Usia anak telah mencapai atau melebihi 60 bulan (5 tahun). Sasaran Posyandu adalah 0-59 bulan.'
      );
    }

    if (!payload.force_create) {
      const [matches] = await pool.query(
        `SELECT c.id, c.internal_code, c.name, c.birth_date, g.name AS guardian_name
         FROM children c
         LEFT JOIN guardians g ON g.id = c.guardian_id
         WHERE c.organization_id = ?
           AND c.birth_date = ?
           AND LOWER(REPLACE(c.name, ' ', '')) = LOWER(REPLACE(?, ' ', ''))
         LIMIT 3`,
        [targetOrgId, payload.birth_date, payload.name]
      );

      if (matches.length > 0) {
        const dupList = matches.map((m) => `${m.name} (${m.internal_code})`).join(', ');
        throw AppError.conflict(
          `Terdeteksi kemungkinan anak duplikat dengan nama dan tanggal lahir yang sama: ${dupList}. Centang opsi force_create jika memang anak yang berbeda.`,
          'DUPLICATE_CHILD_WARNING'
        );
      }
    }

    const createdRecord = await withTransaction(async (conn) => {
      let guardianId = null;
      const [existingGuardians] = await conn.query(
        `SELECT id FROM guardians
         WHERE organization_id = ? AND LOWER(TRIM(name)) = LOWER(?)
         LIMIT 1`,
        [targetOrgId, payload.guardian_name]
      );

      if (existingGuardians.length > 0) {
        guardianId = Number(existingGuardians[0].id);
        if (payload.guardian_phone) {
          await conn.query('UPDATE guardians SET phone = ? WHERE id = ?', [
            payload.guardian_phone,
            guardianId
          ]);
        }
      } else {
        const [gRes] = await conn.query(
          `INSERT INTO guardians (organization_id, name, phone)
           VALUES (?, ?, ?)`,
          [targetOrgId, payload.guardian_name, payload.guardian_phone || null]
        );
        guardianId = Number(gRes.insertId);
      }

      const internalCode = await generateNextInternalCode(conn, targetOrgId);

      const [cRes] = await conn.query(
        `INSERT INTO children
          (organization_id, guardian_id, guardian_relationship, internal_code, name, birth_date, sex, registered_on)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          targetOrgId,
          guardianId,
          payload.guardian_relationship,
          internalCode,
          payload.name,
          payload.birth_date,
          payload.sex,
          registeredOn
        ]
      );

      const childId = Number(cRes.insertId);

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: targetOrgId,
          action: 'CHILD_REGISTERED',
          entityType: 'child',
          entityId: childId,
          requestId: req.requestId,
          changeSummary: `Mendaftarkan balita baru: ${payload.name} (${internalCode}) dengan wali ${payload.guardian_name}.`
        },
        conn
      );

      return {
        id: childId,
        internal_code: internalCode,
        organization_id: targetOrgId,
        guardian_id: guardianId,
        name: payload.name,
        birth_date: payload.birth_date,
        sex: payload.sex,
        registered_on: registeredOn
      };
    });

    return sendSuccess(res, createdRecord, 201);
  } catch (err) {
    next(err);
  }
});

childrenRouter.get('/:id', async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId <= 0) {
      throw AppError.badRequest('ID balita tidak valid.');
    }

    const [rows] = await pool.query(
      `SELECT
        c.id,
        c.organization_id,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        pkm.name AS puskesmas_name,
        c.guardian_id,
        g.name AS guardian_name,
        g.phone AS guardian_phone,
        c.guardian_relationship,
        c.internal_code,
        c.name,
        c.birth_date,
        c.sex,
        c.registered_on,
        c.inactive_on
       FROM children c
       INNER JOIN organizations o ON o.id = c.organization_id
       LEFT JOIN organizations pkm ON pkm.id = o.parent_id
       LEFT JOIN guardians g ON g.id = c.guardian_id
       WHERE c.id = ?
       LIMIT 1`,
      [childId]
    );

    if (rows.length === 0) {
      throw AppError.notFound('Data balita tidak ditemukan.');
    }

    const childRow = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, childRow.organization_id);

    const [attendanceRows] = await pool.query(
      `SELECT
        a.id AS attendance_id,
        a.status AS attendance_status,
        a.recorded_at,
        s.id AS session_id,
        s.session_date,
        s.status AS session_status,
        u.name AS recorded_by_name
       FROM attendances a
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       INNER JOIN users u ON u.id = a.recorded_by
       WHERE a.child_id = ?
       ORDER BY s.session_date DESC`,
      [childId]
    );

    const [auditRows] = await pool.query(
      `SELECT
        a.id,
        a.occurred_at,
        a.action,
        a.change_summary,
        u.name AS actor_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_id
       WHERE a.entity_type = 'child' AND a.entity_id = ?
       ORDER BY a.occurred_at DESC`,
      [childId]
    );

    const birthDateStr = formatDateOnly(childRow.birth_date);
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentAgeDays = Math.max(0, calculateAgeDays(birthDateStr, todayStr));

    return sendSuccess(res, {
      child: {
        id: Number(childRow.id),
        organization_id: Number(childRow.organization_id),
        posyandu_name: childRow.posyandu_name,
        posyandu_code: childRow.posyandu_code,
        puskesmas_name: childRow.puskesmas_name,
        guardian_id: childRow.guardian_id ? Number(childRow.guardian_id) : null,
        guardian_name: childRow.guardian_name || '-',
        guardian_phone: childRow.guardian_phone || '',
        guardian_relationship: childRow.guardian_relationship,
        internal_code: childRow.internal_code,
        name: childRow.name,
        birth_date: birthDateStr,
        sex: childRow.sex,
        registered_on: formatDateOnly(childRow.registered_on),
        inactive_on: formatDateOnly(childRow.inactive_on),
        age_days_current: currentAgeDays,
        age_months_current: Number((currentAgeDays / 30.4375).toFixed(1))
      },
      attendances: attendanceRows.map((a) => ({
        ...a,
        session_date: formatDateOnly(a.session_date)
      })),
      audit_history: auditRows,
      activeHistory: [],
      allRevisions: [],
      whoCurves: null
    });
  } catch (err) {
    next(err);
  }
});

const updateChildSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  guardian_name: z.string().trim().min(2).max(150).optional(),
  guardian_phone: z.string().trim().max(40).nullable().optional(),
  guardian_relationship: z.string().trim().min(2).max(60).optional(),
  is_active: z.boolean().optional()
});

childrenRouter.patch('/:id', verifyCsrf, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const payload = updateChildSchema.parse(req.body || {});

    const [rows] = await pool.query('SELECT * FROM children WHERE id = ? LIMIT 1', [childId]);
    if (rows.length === 0) {
      throw AppError.notFound('Data anak tidak ditemukan.');
    }

    const child = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, child.organization_id);

    await withTransaction(async (conn) => {
      if ((payload.guardian_name !== undefined || payload.guardian_phone !== undefined) && child.guardian_id) {
        const [gRows] = await conn.query('SELECT * FROM guardians WHERE id = ? LIMIT 1', [
          child.guardian_id
        ]);
        if (gRows.length > 0) {
          const nextGName = payload.guardian_name ?? gRows[0].name;
          const nextGPhone =
            payload.guardian_phone !== undefined ? payload.guardian_phone : gRows[0].phone;
          await conn.query('UPDATE guardians SET name = ?, phone = ? WHERE id = ?', [
            nextGName,
            nextGPhone || null,
            child.guardian_id
          ]);
        }
      }

      const nextName = payload.name ?? child.name;
      const nextRel = payload.guardian_relationship ?? child.guardian_relationship;
      let nextInactiveOn = child.inactive_on;
      if (payload.is_active === false && !child.inactive_on) {
        nextInactiveOn = new Date().toISOString().slice(0, 10);
      } else if (payload.is_active === true) {
        nextInactiveOn = null;
      }

      await conn.query(
        'UPDATE children SET name = ?, guardian_relationship = ?, inactive_on = ? WHERE id = ?',
        [nextName, nextRel, nextInactiveOn, childId]
      );

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(child.organization_id),
          action: 'CHILD_UPDATED',
          entityType: 'child',
          entityId: childId,
          requestId: req.requestId,
          changeSummary: `Memperbarui data balita [${child.internal_code}] (aktif=${nextInactiveOn === null}).`
        },
        conn
      );
    });

    return sendSuccess(res, { id: childId, updated: true });
  } catch (err) {
    next(err);
  }
});

childrenRouter.put('/:id', verifyCsrf, async (req, res, next) => {
  req.url = `/${req.params.id}`;
  return childrenRouter.handle(req, res, next);
});

childrenRouter.patch('/:id/deactivate', verifyCsrf, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM children WHERE id = ? LIMIT 1', [childId]);
    if (rows.length === 0) {
      throw AppError.notFound('Data anak tidak ditemukan.');
    }

    const child = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, child.organization_id);

    const inactiveDate = new Date().toISOString().slice(0, 10);
    await pool.query('UPDATE children SET inactive_on = ? WHERE id = ?', [inactiveDate, childId]);

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(child.organization_id),
      action: 'CHILD_DEACTIVATED',
      entityType: 'child',
      entityId: childId,
      requestId: req.requestId,
      changeSummary: `Menonaktifkan balita [${child.internal_code}] ${child.name}.`
    });

    return sendSuccess(res, { id: childId, inactive_on: inactiveDate });
  } catch (err) {
    next(err);
  }
});

const guardianRelSchema = z.object({
  guardian_id: z.number().int().positive().nullable(),
  guardian_relationship: z.string().trim().max(60).optional()
});

childrenRouter.patch('/:id/guardian', verifyCsrf, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const payload = guardianRelSchema.parse(req.body);

    const [rows] = await pool.query('SELECT * FROM children WHERE id = ? LIMIT 1', [childId]);
    if (rows.length === 0) {
      throw AppError.notFound('Data anak tidak ditemukan.');
    }

    const child = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, child.organization_id);

    if (payload.guardian_id) {
      const [gCheck] = await pool.query(
        'SELECT id FROM guardians WHERE id = ? AND organization_id = ? LIMIT 1',
        [payload.guardian_id, child.organization_id]
      );
      if (gCheck.length === 0) {
        throw AppError.badRequest('Wali yang dipilih tidak terdaftar pada unit Posyandu ini.');
      }
    }

    await pool.query(
      'UPDATE children SET guardian_id = ?, guardian_relationship = COALESCE(?, guardian_relationship) WHERE id = ?',
      [payload.guardian_id, payload.guardian_relationship || null, childId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(child.organization_id),
      action: 'CHILD_GUARDIAN_UPDATED',
      entityType: 'child',
      entityId: childId,
      requestId: req.requestId,
      changeSummary: payload.guardian_id
        ? `Menghubungkan balita #${childId} ke wali #${payload.guardian_id}.`
        : `Melepas relasi wali dari balita #${childId}.`
    });

    return sendSuccess(res, { id: childId, guardian_id: payload.guardian_id });
  } catch (err) {
    next(err);
  }
});
