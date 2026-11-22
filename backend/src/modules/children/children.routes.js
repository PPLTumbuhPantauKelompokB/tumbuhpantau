import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';
import {
  calculateAgeDays,
  getWhoReferenceCurves,
  CLINICAL_DISCLAIMER
} from '../../services/growthCalculator.js';

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
        (SELECT COUNT(*) FROM attendances a WHERE a.child_id = c.id) AS attendance_count,
        lm.id AS latest_measurement_id,
        lm.measured_at AS latest_measured_at,
        lm.weight_kg AS latest_weight_kg,
        lm.length_height_cm AS latest_length_height_cm,
        lm.position AS latest_position,
        lm.revision_no AS latest_revision_no,
        ga.id AS latest_assessment_id,
        ga.age_days AS latest_age_days,
        ga.adjusted_length_height_cm AS latest_adjusted_cm,
        ga.z_score AS latest_z_score,
        ga.category AS latest_category,
        ga.quality_status AS latest_quality_status,
        ga.review_status AS latest_review_status
      FROM children c
      INNER JOIN organizations o ON o.id = c.organization_id
      LEFT JOIN guardians g ON g.id = c.guardian_id
      LEFT JOIN (
        SELECT m1.*
        FROM measurements m1
        INNER JOIN attendances a1 ON a1.id = m1.attendance_id
        WHERE m1.status = 'submitted'
          AND m1.id = (
            SELECT m2.id
            FROM measurements m2
            INNER JOIN attendances a2 ON a2.id = m2.attendance_id
            WHERE a2.child_id = a1.child_id AND m2.status = 'submitted'
            ORDER BY m2.measured_at DESC, m2.id DESC
            LIMIT 1
          )
      ) lm ON lm.attendance_id IN (SELECT id FROM attendances WHERE child_id = c.id)
      LEFT JOIN growth_assessments ga ON ga.measurement_id = lm.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.inactive_on IS NOT NULL ASC, c.name ASC
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
        latest_measurement: child.latest_measurement_id
          ? {
              measurement_id: Number(child.latest_measurement_id),
              assessment_id: child.latest_assessment_id ? Number(child.latest_assessment_id) : null,
              measured_at: child.latest_measured_at,
              weight_kg: Number(child.latest_weight_kg),
              length_height_cm: Number(child.latest_length_height_cm),
              adjusted_length_height_cm: Number(child.latest_adjusted_cm),
              position: child.latest_position,
              revision_no: Number(child.latest_revision_no),
              age_days: Number(child.latest_age_days),
              z_score: Number(child.latest_z_score),
              category: child.latest_category,
              quality_status: child.latest_quality_status,
              review_status: child.latest_review_status
            }
          : null
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

    const [measurementRows] = await pool.query(
      `SELECT
        m.id AS measurement_id,
        m.attendance_id,
        a.session_id,
        s.session_date,
        m.revision_no,
        m.supersedes_id,
        m.measured_at,
        m.weight_kg,
        m.length_height_cm,
        m.position,
        m.status,
        m.correction_reason,
        m.created_by,
        u.name AS created_by_name,
        m.created_at,
        ga.id AS assessment_id,
        ga.age_days,
        ga.adjustment_cm,
        ga.adjusted_length_height_cm,
        ga.z_score,
        ga.category,
        ga.quality_status,
        ga.review_reason,
        ga.review_status,
        ga.reviewed_by,
        ru.name AS reviewed_by_name,
        ga.reviewed_at,
        ga.review_note
       FROM measurements m
       INNER JOIN attendances a ON a.id = m.attendance_id
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       INNER JOIN users u ON u.id = m.created_by
       LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
       LEFT JOIN users ru ON ru.id = ga.reviewed_by
       WHERE a.child_id = ?
       ORDER BY s.session_date ASC, m.revision_no ASC, m.id ASC`,
      [childId]
    );

    const allRevisions = measurementRows.map((m) => ({
      measurement_id: Number(m.measurement_id),
      attendance_id: Number(m.attendance_id),
      session_id: Number(m.session_id),
      session_date: formatDateOnly(m.session_date),
      revision_no: Number(m.revision_no),
      supersedes_id: m.supersedes_id ? Number(m.supersedes_id) : null,
      measured_at: m.measured_at,
      weight_kg: m.weight_kg !== null ? Number(m.weight_kg) : null,
      length_height_cm: m.length_height_cm !== null ? Number(m.length_height_cm) : null,
      position: m.position,
      status: m.status,
      correction_reason: m.correction_reason,
      created_by: Number(m.created_by),
      created_by_name: m.created_by_name,
      created_at: m.created_at,
      assessment: m.assessment_id
        ? {
            id: Number(m.assessment_id),
            age_days: Number(m.age_days),
            age_months: Number((Number(m.age_days) / 30.4375).toFixed(1)),
            adjustment_cm: Number(m.adjustment_cm),
            adjusted_length_height_cm: Number(m.adjusted_length_height_cm),
            z_score: Number(m.z_score),
            category: m.category,
            quality_status: m.quality_status,
            review_reason: m.review_reason,
            review_status: m.review_status,
            reviewed_by_name: m.reviewed_by_name || null,
            reviewed_at: m.reviewed_at,
            review_note: m.review_note
          }
        : null
    }));

    const activeHistory = allRevisions.filter((m) => m.status === 'submitted' && m.assessment);

    const [followUpRows] = await pool.query(
      `SELECT
        f.id,
        f.type,
        f.description,
        f.due_date,
        f.status,
        f.created_at,
        u.name AS assigned_to_name
       FROM follow_ups f
       INNER JOIN users u ON u.id = f.assigned_to
       WHERE f.child_id = ?
       ORDER BY f.created_at DESC`,
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
      whoCurves: getWhoReferenceCurves(childRow.sex),
      activeHistory,
      allRevisions,
      followUps: followUpRows.map((f) => ({
        ...f,
        id: Number(f.id),
        due_date: formatDateOnly(f.due_date)
      })),
      disclaimer: CLINICAL_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
});

childrenRouter.get('/:id/growth-history', async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId <= 0) {
      throw AppError.badRequest('ID balita tidak valid.');
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.organization_id, c.internal_code, c.name, c.birth_date, c.sex
       FROM children c
       WHERE c.id = ?
       LIMIT 1`,
      [childId]
    );
    if (rows.length === 0) {
      throw AppError.notFound('Data balita tidak ditemukan.');
    }

    const childRow = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, childRow.organization_id);

    const [measurementRows] = await pool.query(
      `SELECT
        m.id AS measurement_id,
        m.attendance_id,
        a.session_id,
        s.session_date,
        m.revision_no,
        m.supersedes_id,
        m.measured_at,
        m.weight_kg,
        m.length_height_cm,
        m.position,
        m.status,
        m.correction_reason,
        m.created_by,
        u.name AS created_by_name,
        m.created_at,
        ga.id AS assessment_id,
        ga.age_days,
        ga.adjustment_cm,
        ga.adjusted_length_height_cm,
        ga.z_score,
        ga.category,
        ga.quality_status,
        ga.review_reason,
        ga.review_status
       FROM measurements m
       INNER JOIN attendances a ON a.id = m.attendance_id
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       INNER JOIN users u ON u.id = m.created_by
       LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
       WHERE a.child_id = ?
       ORDER BY s.session_date ASC, m.revision_no ASC, m.id ASC`,
      [childId]
    );

    const allRevisions = measurementRows.map((m) => ({
      measurement_id: Number(m.measurement_id),
      attendance_id: Number(m.attendance_id),
      session_id: Number(m.session_id),
      session_date: formatDateOnly(m.session_date),
      revision_no: Number(m.revision_no),
      supersedes_id: m.supersedes_id ? Number(m.supersedes_id) : null,
      measured_at: m.measured_at,
      weight_kg: m.weight_kg !== null ? Number(m.weight_kg) : null,
      length_height_cm: m.length_height_cm !== null ? Number(m.length_height_cm) : null,
      position: m.position,
      status: m.status,
      correction_reason: m.correction_reason,
      created_by: Number(m.created_by),
      created_by_name: m.created_by_name,
      created_at: m.created_at,
      assessment: m.assessment_id
        ? {
            id: Number(m.assessment_id),
            age_days: Number(m.age_days),
            age_months: Number((Number(m.age_days) / 30.4375).toFixed(1)),
            adjustment_cm: Number(m.adjustment_cm),
            adjusted_length_height_cm: Number(m.adjusted_length_height_cm),
            z_score: Number(m.z_score),
            category: m.category,
            quality_status: m.quality_status,
            review_reason: m.review_reason,
            review_status: m.review_status
          }
        : null
    }));

    const activeHistory = allRevisions.filter((m) => m.status === 'submitted' && m.assessment);

    return sendSuccess(res, {
      child: {
        id: Number(childRow.id),
        organization_id: Number(childRow.organization_id),
        internal_code: childRow.internal_code,
        name: childRow.name,
        birth_date: formatDateOnly(childRow.birth_date),
        sex: childRow.sex
      },
      whoCurves: getWhoReferenceCurves(childRow.sex),
      activeHistory,
      allRevisions,
      disclaimer: CLINICAL_DISCLAIMER
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

childrenRouter.patch('/:id/activate', verifyCsrf, async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId <= 0) {
      throw AppError.badRequest('ID balita tidak valid.');
    }

    const [rows] = await pool.query('SELECT * FROM children WHERE id = ? LIMIT 1', [childId]);
    if (rows.length === 0) {
      throw AppError.notFound('Data anak tidak ditemukan.');
    }

    const child = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, child.organization_id);

    if (child.inactive_on === null) {
      throw AppError.badRequest('Profil balita ini sudah berstatus aktif.');
    }

    await pool.query('UPDATE children SET inactive_on = NULL WHERE id = ?', [childId]);

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(child.organization_id),
      action: 'CHILD_ACTIVATED',
      entityType: 'child',
      entityId: childId,
      requestId: req.requestId,
      changeSummary: `Mengaktifkan kembali profil balita [${child.internal_code}] ${child.name}.`
    });

    return sendSuccess(res, { id: childId, inactive_on: null, is_active: true });
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
