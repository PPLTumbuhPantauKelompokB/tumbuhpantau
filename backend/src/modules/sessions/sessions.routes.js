import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';
import { calculateAgeDays, getRecommendedPosition } from '../../services/growthCalculator.js';

export const sessionsRouter = Router();

sessionsRouter.use(
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

sessionsRouter.get('/', async (req, res, next) => {
  try {
    const user = req.user;
    const allowedOrgIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
    if (allowedOrgIds.length === 0) {
      return sendSuccess(res, []);
    }

    const { organization_id, status } = req.query;
    let targetOrgIds = allowedOrgIds;
    if (organization_id) {
      const parsedOrgId = Number(organization_id);
      if (!allowedOrgIds.includes(parsedOrgId)) {
        throw AppError.forbidden('Anda tidak memiliki izin mengakses Posyandu ini.');
      }
      targetOrgIds = [parsedOrgId];
    }

    const conditions = ['s.organization_id IN (?)'];
    const params = [targetOrgIds];

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }

    const querySql = `
      SELECT
        s.id,
        s.organization_id,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        s.session_date,
        s.status,
        s.notes,
        s.created_by,
        u.name AS created_by_name,
        s.created_at,
        s.closed_at,
        s.cancelled_at,
        s.cancel_reason,
        (SELECT COUNT(*) FROM children c WHERE c.organization_id = s.organization_id AND c.inactive_on IS NULL) AS active_children_count,
        (SELECT COUNT(*) FROM attendances a WHERE a.session_id = s.id AND a.status = 'present') AS present_count,
        (SELECT COUNT(*) FROM attendances a WHERE a.session_id = s.id AND a.status = 'absent') AS absent_count,
        (
          SELECT COUNT(DISTINCT a.id)
          FROM attendances a
          INNER JOIN measurements m ON m.attendance_id = a.id
          WHERE a.session_id = s.id AND m.status = 'submitted'
        ) AS measured_submitted_count,
        (
          SELECT COUNT(DISTINCT a.id)
          FROM attendances a
          INNER JOIN measurements m ON m.attendance_id = a.id
          WHERE a.session_id = s.id AND m.status = 'draft'
        ) AS measured_draft_count
      FROM posyandu_sessions s
      INNER JOIN organizations o ON o.id = s.organization_id
      INNER JOIN users u ON u.id = s.created_by
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.session_date DESC, s.id DESC
    `;

    const [rows] = await pool.query(querySql, params);

    const result = rows.map((r) => ({
      id: Number(r.id),
      organization_id: Number(r.organization_id),
      posyandu_name: r.posyandu_name,
      posyandu_code: r.posyandu_code,
      session_date: formatDateOnly(r.session_date),
      status: r.status,
      notes: r.notes || '',
      created_by: Number(r.created_by),
      created_by_name: r.created_by_name,
      created_at: r.created_at,
      closed_at: r.closed_at,
      cancelled_at: r.cancelled_at,
      cancel_reason: r.cancel_reason,
      active_children_count: Number(r.active_children_count) || 0,
      present_count: Number(r.present_count) || 0,
      absent_count: Number(r.absent_count) || 0,
      measured_submitted_count: Number(r.measured_submitted_count) || 0,
      measured_draft_count: Number(r.measured_draft_count) || 0
    }));

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

const openSessionSchema = z.object({
  organization_id: z.number().int().positive().optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  notes: z.string().trim().max(500).optional()
});

sessionsRouter.post('/', verifyCsrf, async (req, res, next) => {
  try {
    const payload = openSessionSchema.parse(req.body);
    const orgId = payload.organization_id || req.user.organization_id;

    await AccessPolicy.assertPosyanduAccess(req.user, orgId);

    const [existing] = await pool.query(
      `SELECT id, session_date, status
       FROM posyandu_sessions
       WHERE organization_id = ? AND session_date = ?
       LIMIT 1`,
      [orgId, payload.session_date]
    );

    if (existing.length > 0) {
      const sess = existing[0];
      throw AppError.conflict(
        `Sesi Posyandu pada tanggal ${payload.session_date} sudah ada dengan status '${sess.status}'.`,
        'SESSION_DUPLICATE_DATE'
      );
    }

    const [insertRes] = await pool.query(
      `INSERT INTO posyandu_sessions (organization_id, session_date, status, notes, created_by)
       VALUES (?, ?, 'open', ?, ?)`,
      [orgId, payload.session_date, payload.notes || null, req.user.id]
    );

    const sessionId = Number(insertRes.insertId);

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: orgId,
      action: 'SESSION_OPENED',
      entityType: 'posyandu_session',
      entityId: sessionId,
      requestId: req.requestId,
      changeSummary: `Membuka sesi kegiatan Posyandu tanggal ${payload.session_date}.`
    });

    return sendSuccess(
      res,
      {
        id: sessionId,
        organization_id: orgId,
        session_date: payload.session_date,
        status: 'open',
        notes: payload.notes || ''
      },
      201
    );
  } catch (err) {
    next(err);
  }
});

sessionsRouter.get('/:id', async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw AppError.badRequest('ID sesi tidak valid.');
    }

    const [sessionRows] = await pool.query(
      `SELECT
        s.id,
        s.organization_id,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        s.session_date,
        s.status,
        s.notes,
        s.created_by,
        u.name AS created_by_name,
        s.created_at,
        s.closed_at,
        s.cancelled_at,
        s.cancel_reason
       FROM posyandu_sessions s
       INNER JOIN organizations o ON o.id = s.organization_id
       INNER JOIN users u ON u.id = s.created_by
       WHERE s.id = ?
       LIMIT 1`,
      [sessionId]
    );

    if (sessionRows.length === 0) {
      throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
    }

    const sessionRow = sessionRows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, sessionRow.organization_id);

    const [childRows] = await pool.query(
      `SELECT
        c.id AS child_id,
        c.internal_code,
        c.name AS child_name,
        c.birth_date,
        c.sex,
        c.guardian_relationship,
        g.name AS guardian_name,
        g.phone AS guardian_phone,
        a.id AS attendance_id,
        a.status AS attendance_status,
        a.recorded_by,
        ru.name AS recorded_by_name,
        a.recorded_at,
        m.id AS measurement_id,
        m.status AS measurement_status,
        m.revision_no,
        m.weight_kg,
        m.length_height_cm,
        m.position,
        m.measured_at,
        ga.id AS assessment_id,
        ga.age_days,
        ga.adjustment_cm,
        ga.adjusted_length_height_cm,
        ga.z_score,
        ga.category,
        ga.quality_status,
        ga.review_status
       FROM children c
       LEFT JOIN guardians g ON g.id = c.guardian_id
       LEFT JOIN attendances a ON a.session_id = ? AND a.child_id = c.id
       LEFT JOIN users ru ON ru.id = a.recorded_by
       LEFT JOIN measurements m ON m.attendance_id = a.id AND m.status IN ('submitted', 'draft')
         AND m.id = (
           SELECT m2.id
           FROM measurements m2
           WHERE m2.attendance_id = a.id AND m2.status IN ('submitted', 'draft')
           ORDER BY FIELD(m2.status, 'submitted', 'draft'), m2.revision_no DESC, m2.id DESC
           LIMIT 1
         )
       LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
       WHERE c.organization_id = ?
         AND (c.inactive_on IS NULL OR a.id IS NOT NULL)
       ORDER BY c.name ASC`,
      [sessionId, sessionRow.organization_id]
    );

    const sessionDateStr = formatDateOnly(sessionRow.session_date);

    const childrenData = childRows.map((r) => {
      const birthDateStr = formatDateOnly(r.birth_date);
      const ageDaysAtSession = Math.max(0, calculateAgeDays(birthDateStr, sessionDateStr));
      const ageMonthsAtSession = Number((ageDaysAtSession / 30.4375).toFixed(1));
      const recommendedPos = getRecommendedPosition(ageDaysAtSession);

      return {
        child_id: Number(r.child_id),
        internal_code: r.internal_code,
        child_name: r.child_name,
        birth_date: birthDateStr,
        sex: r.sex,
        guardian_name: r.guardian_name || '-',
        guardian_phone: r.guardian_phone || '',
        guardian_relationship: r.guardian_relationship,
        age_days_at_session: ageDaysAtSession,
        age_months_at_session: ageMonthsAtSession,
        recommended_position: recommendedPos,
        attendance_id: r.attendance_id ? Number(r.attendance_id) : null,
        attendance_status: r.attendance_status || null,
        attendance_recorded_by: r.recorded_by ? Number(r.recorded_by) : null,
        attendance_recorded_by_name: r.recorded_by_name || null,
        attendance_recorded_at: r.recorded_at || null,
        recorded_at: r.recorded_at || null,
        measurement: r.measurement_id
          ? {
              id: Number(r.measurement_id),
              status: r.measurement_status,
              revision_no: Number(r.revision_no),
              weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
              length_height_cm: r.length_height_cm !== null ? Number(r.length_height_cm) : null,
              position: r.position,
              measured_at: r.measured_at,
              assessment: r.assessment_id
                ? {
                    id: Number(r.assessment_id),
                    age_days: Number(r.age_days),
                    adjustment_cm: Number(r.adjustment_cm),
                    adjusted_length_height_cm: Number(r.adjusted_length_height_cm),
                    z_score: Number(r.z_score),
                    category: r.category,
                    quality_status: r.quality_status,
                    review_status: r.review_status
                  }
                : null
            }
          : null
      };
    });

    return sendSuccess(res, {
      session: {
        id: Number(sessionRow.id),
        organization_id: Number(sessionRow.organization_id),
        posyandu_name: sessionRow.posyandu_name,
        posyandu_code: sessionRow.posyandu_code,
        session_date: sessionDateStr,
        status: sessionRow.status,
        notes: sessionRow.notes || '',
        created_by: Number(sessionRow.created_by),
        created_by_name: sessionRow.created_by_name,
        created_at: sessionRow.created_at,
        closed_at: sessionRow.closed_at,
        cancelled_at: sessionRow.cancelled_at,
        cancel_reason: sessionRow.cancel_reason
      },
      children: childrenData
    });
  } catch (err) {
    next(err);
  }
});

const updateSessionSchema = z.object({
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.').optional(),
  notes: z.string().trim().max(500).optional()
});

sessionsRouter.put('/:id', verifyCsrf, async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);
    const payload = updateSessionSchema.parse(req.body);

    const [rows] = await pool.query('SELECT * FROM posyandu_sessions WHERE id = ? LIMIT 1', [
      sessionId
    ]);
    if (rows.length === 0) {
      throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
    }

    const sess = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, sess.organization_id);

    if (sess.status !== 'open') {
      throw AppError.badRequest('Hanya sesi dengan status terbuka (open) yang dapat diubah jadwal atau catatannya.');
    }

    if (payload.session_date && payload.session_date !== formatDateOnly(sess.session_date)) {
      const [dup] = await pool.query(
        'SELECT id FROM posyandu_sessions WHERE organization_id = ? AND session_date = ? AND id != ? LIMIT 1',
        [sess.organization_id, payload.session_date, sessionId]
      );
      if (dup.length > 0) {
        throw AppError.conflict(`Sudah terdapat sesi Posyandu pada tanggal ${payload.session_date}.`);
      }
    }

    const nextDate = payload.session_date || formatDateOnly(sess.session_date);
    const nextNotes = payload.notes !== undefined ? payload.notes : sess.notes;

    await pool.query(
      'UPDATE posyandu_sessions SET session_date = ?, notes = ? WHERE id = ?',
      [nextDate, nextNotes || null, sessionId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(sess.organization_id),
      action: 'SESSION_UPDATED',
      entityType: 'posyandu_session',
      entityId: sessionId,
      requestId: req.requestId,
      changeSummary: `Menyesuaikan jadwal/catatan sesi #${sessionId} menjadi tanggal ${nextDate}.`
    });

    return sendSuccess(res, { id: sessionId, session_date: nextDate, notes: nextNotes || '' });
  } catch (err) {
    next(err);
  }
});

const cancelSessionSchema = z.object({
  reason: z.string().trim().min(3, 'Alasan pembatalan minimal 3 karakter.').max(500)
});

sessionsRouter.patch('/:id/cancel', verifyCsrf, async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);
    const payload = cancelSessionSchema.parse(req.body);

    const [rows] = await pool.query('SELECT * FROM posyandu_sessions WHERE id = ? LIMIT 1', [
      sessionId
    ]);
    if (rows.length === 0) {
      throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
    }

    const sess = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, sess.organization_id);

    if (sess.status === 'cancelled') {
      throw AppError.badRequest('Sesi ini sudah dalam status dibatalkan.');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      `UPDATE posyandu_sessions
       SET status = 'cancelled', cancelled_at = ?, cancel_reason = ?
       WHERE id = ?`,
      [now, payload.reason, sessionId]
    );

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(sess.organization_id),
      action: 'SESSION_CANCELLED',
      entityType: 'posyandu_session',
      entityId: sessionId,
      requestId: req.requestId,
      changeSummary: `Membatalkan sesi Posyandu #${sessionId} pada tanggal ${formatDateOnly(sess.session_date)}: ${payload.reason}`
    });

    return sendSuccess(res, { id: sessionId, status: 'cancelled', cancel_reason: payload.reason });
  } catch (err) {
    next(err);
  }
});

sessionsRouter.post('/:id/close', verifyCsrf, async (req, res, next) => {
  try {
    const sessionId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM posyandu_sessions WHERE id = ? LIMIT 1', [
      sessionId
    ]);
    if (rows.length === 0) {
      throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
    }

    const sess = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, sess.organization_id);

    if (sess.status !== 'open') {
      throw AppError.badRequest('Hanya sesi dengan status terbuka yang dapat ditutup.');
    }

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query('UPDATE posyandu_sessions SET status = ?, closed_at = ? WHERE id = ?', [
      'closed',
      now,
      sessionId
    ]);

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: Number(sess.organization_id),
      action: 'SESSION_CLOSED',
      entityType: 'posyandu_session',
      entityId: sessionId,
      requestId: req.requestId,
      changeSummary: `Menutup sesi kegiatan Posyandu #${sessionId}.`
    });

    return sendSuccess(res, { id: sessionId, status: 'closed', closed_at: now });
  } catch (err) {
    next(err);
  }
});

const attendanceItemsSchema = z.object({
  items: z
    .array(
      z.object({
        child_id: z.number().int().positive(),
        status: z.enum(['present', 'absent'])
      })
    )
    .min(1, 'Daftar kehadiran minimal berisi 1 data anak.')
});

sessionsRouter.post(
  '/:id/attendances',
  verifyCsrf,
  requireRoles(ROLES.KADER),
  async (req, res, next) => {
    try {
      const sessionId = Number(req.params.id);
      const payload = attendanceItemsSchema.parse(req.body);

      const [sessRows] = await pool.query(
        'SELECT * FROM posyandu_sessions WHERE id = ? LIMIT 1',
        [sessionId]
      );
      if (sessRows.length === 0) {
        throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
      }

      const sessionRow = sessRows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, sessionRow.organization_id);

      if (sessionRow.status !== 'open') {
        throw AppError.badRequest('Kehadiran hanya dapat dicatat saat sesi masih terbuka.');
      }

      const childIds = payload.items.map((i) => i.child_id);
      const [validChildren] = await pool.query(
        'SELECT id FROM children WHERE id IN (?) AND organization_id = ?',
        [childIds, sessionRow.organization_id]
      );

      const validChildIdSet = new Set(validChildren.map((c) => Number(c.id)));
      for (const item of payload.items) {
        if (!validChildIdSet.has(item.child_id)) {
          throw AppError.badRequest(
            `Balita ID ${item.child_id} tidak terdaftar pada Posyandu sesi ini.`
          );
        }
      }

      const savedAttendances = await withTransaction(async (conn) => {
        const results = [];
        for (const item of payload.items) {
          await conn.query(
            `INSERT INTO attendances (session_id, child_id, status, recorded_by, recorded_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE status = VALUES(status), recorded_by = VALUES(recorded_by), recorded_at = CURRENT_TIMESTAMP`,
            [sessionId, item.child_id, item.status, req.user.id]
          );

          const [attRow] = await conn.query(
            'SELECT id, session_id, child_id, status, recorded_at FROM attendances WHERE session_id = ? AND child_id = ?',
            [sessionId, item.child_id]
          );
          results.push(attRow[0]);
        }

        await recordAuditLog(
          {
            actorId: req.user.id,
            organizationId: Number(sessionRow.organization_id),
            action: 'ATTENDANCE_RECORDED',
            entityType: 'posyandu_session',
            entityId: sessionId,
            requestId: req.requestId,
            changeSummary: `Mencatat kehadiran ${results.length} anak pada sesi Posyandu #${sessionId}.`
          },
          conn
        );

        return results;
      });

      return sendSuccess(res, {
        session_id: sessionId,
        updated_count: savedAttendances.length,
        attendances: savedAttendances
      });
    } catch (err) {
      next(err);
    }
  }
);

const updateAttendanceStatusSchema = z.object({
  status: z.enum(['present', 'absent'], {
    errorMap: () => ({ message: 'Status kehadiran harus present atau absent.' })
  })
});

sessionsRouter.patch(
  '/:sessionId/attendances/:id',
  verifyCsrf,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  async (req, res, next) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const attendanceId = Number(req.params.id);
      if (!Number.isInteger(sessionId) || sessionId <= 0 || !Number.isInteger(attendanceId) || attendanceId <= 0) {
        throw AppError.badRequest('ID sesi atau ID kehadiran tidak valid.');
      }

      const payload = updateAttendanceStatusSchema.parse(req.body || {});

      const [sessRows] = await pool.query(
        'SELECT * FROM posyandu_sessions WHERE id = ? LIMIT 1',
        [sessionId]
      );
      if (sessRows.length === 0) {
        throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
      }

      const sessionRow = sessRows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, sessionRow.organization_id);

      if (sessionRow.status !== 'open') {
        throw AppError.badRequest(
          'Catatan kehadiran pada sesi yang sudah ditutup atau dibatalkan tidak dapat diubah.'
        );
      }

      const [attRows] = await pool.query(
        `SELECT a.*, c.name AS child_name, c.internal_code
         FROM attendances a
         INNER JOIN children c ON c.id = a.child_id
         WHERE a.id = ? AND a.session_id = ?
         LIMIT 1`,
        [attendanceId, sessionId]
      );

      if (attRows.length === 0) {
        throw AppError.notFound('Catatan kehadiran balita pada sesi ini tidak ditemukan.');
      }

      const existingAtt = attRows[0];
      const previousStatus = existingAtt.status;

      const updatedAttendance = await withTransaction(async (conn) => {
        await conn.query(
          `UPDATE attendances
           SET status = ?, recorded_by = ?, recorded_at = CURRENT_TIMESTAMP
           WHERE id = ? AND session_id = ?`,
          [payload.status, req.user.id, attendanceId, sessionId]
        );

        const [afterRows] = await conn.query(
          `SELECT a.id, a.session_id, a.child_id, a.status, a.recorded_by, u.name AS recorded_by_name, a.recorded_at
           FROM attendances a
           INNER JOIN users u ON u.id = a.recorded_by
           WHERE a.id = ?
           LIMIT 1`,
          [attendanceId]
        );

        await recordAuditLog(
          {
            actorId: req.user.id,
            organizationId: Number(sessionRow.organization_id),
            action: 'ATTENDANCE_UPDATED',
            entityType: 'attendance',
            entityId: attendanceId,
            requestId: req.requestId,
            changeSummary: `Mengubah status kehadiran [${existingAtt.internal_code}] ${existingAtt.child_name} pada sesi #${sessionId} dari '${previousStatus}' menjadi '${payload.status}'.`
          },
          conn
        );

        return afterRows[0];
      });

      return sendSuccess(res, {
        id: Number(updatedAttendance.id),
        session_id: Number(updatedAttendance.session_id),
        child_id: Number(updatedAttendance.child_id),
        previous_status: previousStatus,
        status: updatedAttendance.status,
        recorded_by: Number(updatedAttendance.recorded_by),
        recorded_by_name: updatedAttendance.recorded_by_name,
        recorded_at: updatedAttendance.recorded_at
      });
    } catch (err) {
      next(err);
    }
  }
);
