import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';
import { CLINICAL_DISCLAIMER } from '../../services/growthCalculator.js';

export const reviewsRouter = Router();

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

async function handleGetReviewsList(req, res, next) {
  try {
    const user = req.user;
    const allowedPosyanduIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
    if (allowedPosyanduIds.length === 0) {
      return sendSuccess(res, { items: [], disclaimer: CLINICAL_DISCLAIMER });
    }

    const rawOrgId = req.query.organization_id || req.query.posyanduId;
    const requestedOrgId = rawOrgId ? Number(rawOrgId) : null;
    if (requestedOrgId && !allowedPosyanduIds.includes(requestedOrgId)) {
      throw AppError.forbidden('Posyandu berada di luar cakupan wilayah Anda.');
    }

    const targetIds = requestedOrgId ? [requestedOrgId] : allowedPosyanduIds;
    const statusFilter = req.query.review_status || req.query.status || 'pending';
    const categoryFilter = req.query.category || '';

    let sql = `
      SELECT
        ga.id AS assessment_id,
        ga.measurement_id,
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
        ga.review_note,
        m.attendance_id,
        m.revision_no,
        m.measured_at,
        m.weight_kg,
        m.length_height_cm,
        m.position,
        m.correction_reason,
        cu.name AS measured_by_name,
        a.session_id,
        s.session_date,
        c.id AS child_id,
        c.organization_id,
        c.internal_code,
        c.name AS child_name,
        c.birth_date,
        c.sex,
        g.name AS guardian_name,
        g.phone AS guardian_phone,
        o.name AS posyandu_name,
        o.code AS posyandu_code
      FROM growth_assessments ga
      INNER JOIN measurements m ON m.id = ga.measurement_id
      INNER JOIN attendances a ON a.id = m.attendance_id
      INNER JOIN posyandu_sessions s ON s.id = a.session_id
      INNER JOIN children c ON c.id = a.child_id
      LEFT JOIN guardians g ON g.id = c.guardian_id
      INNER JOIN organizations o ON o.id = c.organization_id
      INNER JOIN users cu ON cu.id = m.created_by
      LEFT JOIN users ru ON ru.id = ga.reviewed_by
      WHERE m.status = 'submitted'
        AND c.organization_id IN (${targetIds.map(() => '?').join(',')})
    `;
    const params = [...targetIds];

    if (statusFilter && statusFilter !== 'all') {
      const normalizedStatus =
        statusFilter === 'flagged_for_remeasurement'
          ? 'remeasure_requested'
          : statusFilter === 'confirmed' || statusFilter === 'monitoring'
            ? 'validated'
            : statusFilter;
      sql += ' AND ga.review_status = ?';
      params.push(normalizedStatus);
    } else {
      sql += " AND ga.review_status IN ('pending', 'validated', 'remeasure_requested')";
    }

    if (categoryFilter) {
      sql += ' AND ga.category = ?';
      params.push(categoryFilter);
    }

    sql += ` ORDER BY FIELD(ga.review_status, 'pending', 'remeasure_requested', 'validated'), m.measured_at DESC, ga.id DESC`;

    const [rows] = await pool.query(sql, params);

    return sendSuccess(res, {
      items: rows.map((r) => ({
        assessment_id: Number(r.assessment_id),
        measurement_id: Number(r.measurement_id),
        attendance_id: Number(r.attendance_id),
        session_id: Number(r.session_id),
        session_date: formatDateOnly(r.session_date),
        child_id: Number(r.child_id),
        organization_id: Number(r.organization_id),
        posyandu_name: r.posyandu_name,
        posyandu_code: r.posyandu_code,
        internal_code: r.internal_code,
        child_name: r.child_name,
        birth_date: formatDateOnly(r.birth_date),
        sex: r.sex,
        guardian_name: r.guardian_name || '-',
        guardian_phone: r.guardian_phone || '',
        revision_no: Number(r.revision_no),
        measured_at: r.measured_at,
        measured_by_name: r.measured_by_name,
        weight_kg: Number(r.weight_kg),
        length_height_cm: Number(r.length_height_cm),
        position: r.position,
        age_days: Number(r.age_days),
        age_months: Number((Number(r.age_days) / 30.4375).toFixed(1)),
        adjustment_cm: Number(r.adjustment_cm),
        adjusted_length_height_cm: Number(r.adjusted_length_height_cm),
        z_score: Number(r.z_score),
        category: r.category,
        quality_status: r.quality_status,
        review_reason: r.review_reason,
        review_status: r.review_status,
        reviewed_by: r.reviewed_by ? Number(r.reviewed_by) : null,
        reviewed_by_name: r.reviewed_by_name || null,
        reviewed_at: r.reviewed_at,
        review_note: r.review_note || '',
        review_notes: r.review_note || ''
      })),
      disclaimer: CLINICAL_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
}

reviewsRouter.get(
  '/reviews/queue',
  requireAuth,
  requireRoles(ROLES.PETUGAS_PUSKESMAS),
  handleGetReviewsList
);

reviewsRouter.get(
  '/reviews',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  handleGetReviewsList
);

const decisionSchema = z.object({
  decision: z.enum([
    'validated',
    'remeasure_requested',
    'follow_up_required',
    'confirmed',
    'flagged_for_remeasurement',
    'monitoring'
  ]),
  review_note: z.string().trim().max(500).optional(),
  review_notes: z.string().trim().max(500).optional(),
  auto_create_follow_up: z.boolean().optional(),
  follow_up: z
    .object({
      type: z.string().trim().optional(),
      description: z.string().trim().min(5).max(500),
      assigned_to: z.number().int().positive().optional(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
    .optional()
});

function normalizeFollowUpType(inputType) {
  if (!inputType) return 'clinical_review';
  if (['clinical_review', 'remeasurement', 'operational_measurement'].includes(inputType)) {
    return inputType;
  }
  const lower = String(inputType).toLowerCase();
  if (lower.includes('ukur')) return 'remeasurement';
  if (lower.includes('kunjungan')) return 'operational_measurement';
  return 'clinical_review';
}

async function handleRecordReviewDecision(req, res, next) {
  try {
    const assessmentId = Number(req.params.assessmentId || req.params.id);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
      throw AppError.badRequest('ID penilaian antropometri tidak valid.');
    }

    const payload = decisionSchema.parse({
      ...req.body,
      decision: req.body?.decision || req.body?.review_status,
      auto_create_follow_up:
        req.body?.auto_create_follow_up ?? req.body?.create_follow_up,
      ...(req.body?.follow_up
        ? {
            follow_up: {
              ...req.body.follow_up,
              type: req.body.follow_up.type || req.body.follow_up.category,
              assigned_to: req.body.follow_up.assigned_to
                ? Number(req.body.follow_up.assigned_to)
                : undefined
            }
          }
        : {})
    });

    const rawNote = payload.review_note ?? payload.review_notes ?? '';
    const isRemeasure =
      payload.decision === 'remeasure_requested' ||
      payload.decision === 'flagged_for_remeasurement';
    const isFollowUpDecision =
      payload.decision === 'follow_up_required' ||
      payload.decision === 'confirmed' ||
      payload.auto_create_follow_up === true ||
      Boolean(payload.follow_up);

    if (isRemeasure && (!rawNote || rawNote.length < 4)) {
      throw AppError.validationError('Catatan alasan permintaan ukur ulang wajib diisi.', {
        review_note: 'Tuliskan alasan permintaan ukur ulang minimal 4 karakter.'
      });
    }

    if (payload.decision === 'follow_up_required' && !payload.follow_up) {
      throw AppError.validationError('Detail penugasan tindak lanjut wajib dilengkapi.', {
        follow_up: 'Isi deskripsi, penanggung jawab, dan batas waktu tindak lanjut.'
      });
    }

    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
          ga.id,
          ga.review_status,
          ga.z_score,
          ga.category,
          m.status AS measurement_status,
          c.id AS child_id,
          c.name AS child_name,
          c.internal_code,
          c.organization_id
         FROM growth_assessments ga
         INNER JOIN measurements m ON m.id = ga.measurement_id
         INNER JOIN attendances a ON a.id = m.attendance_id
         INNER JOIN children c ON c.id = a.child_id
         WHERE ga.id = ?
         FOR UPDATE`,
        [assessmentId]
      );

      if (rows.length === 0) {
        throw AppError.notFound('Data penilaian antropometri tidak ditemukan.');
      }

      const item = rows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, item.organization_id, conn);

      if (item.measurement_status !== 'submitted') {
        throw AppError.conflict('Versi pengukuran ini sudah tidak aktif (voided/draft).');
      }

      const nextReviewStatus = isRemeasure ? 'remeasure_requested' : 'validated';
      const noteText =
        rawNote ||
        (payload.follow_up
          ? `Divalidasi dengan tindak lanjut: ${payload.follow_up.description}`
          : payload.decision === 'confirmed'
            ? 'Terkonfirmasi memerlukan intervensi dan pendampingan gizi lanjutan.'
            : 'Hasil pengukuran telah diverifikasi oleh Petugas Puskesmas.');

      await conn.query(
        `UPDATE growth_assessments
         SET review_status = ?,
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP,
             review_note = ?
         WHERE id = ?`,
        [nextReviewStatus, req.user.id, noteText, assessmentId]
      );

      let createdFollowUpId = null;

      if (isFollowUpDecision) {
        let assignedToId = payload.follow_up?.assigned_to;
        if (!assignedToId) {
          const [kaderRows] = await conn.query(
            "SELECT id FROM users WHERE organization_id = ? AND role = 'kader' AND is_active = 1 LIMIT 1",
            [item.organization_id]
          );
          assignedToId = kaderRows.length > 0 ? Number(kaderRows[0].id) : req.user.id;
        }

        const defaultDue = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
        const dueDate = payload.follow_up?.due_date || defaultDue;
        const fuType = normalizeFollowUpType(payload.follow_up?.type);
        const fuDesc =
          payload.follow_up?.description ||
          `Intervensi gizi & kunjungan pendampingan untuk ${item.child_name} (${item.internal_code}) dengan Z-Score ${item.z_score} SD.`;

        const [fuRes] = await conn.query(
          `INSERT INTO follow_ups
            (child_id, assessment_id, type, description, assigned_to, created_by, due_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
          [
            item.child_id,
            assessmentId,
            fuType,
            fuDesc,
            assignedToId,
            req.user.id,
            dueDate
          ]
        );
        createdFollowUpId = Number(fuRes.insertId);
      }

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(item.organization_id),
          action: 'REVIEW_DECISION_RECORDED',
          entityType: 'growth_assessment',
          entityId: assessmentId,
          requestId: req.requestId,
          changeSummary: `Keputusan peninjauan [${item.internal_code}] Z=${item.z_score}: ${payload.decision}${
            createdFollowUpId ? ` (Tindak lanjut #${createdFollowUpId})` : ''
          }.`
        },
        conn
      );

      return {
        assessment_id: assessmentId,
        decision: payload.decision,
        review_status: nextReviewStatus,
        review_note: noteText,
        review_notes: noteText,
        reviewed_by: req.user.id,
        follow_up_id: createdFollowUpId
      };
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

reviewsRouter.post(
  '/reviews/:assessmentId/decision',
  requireAuth,
  requireRoles(ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  handleRecordReviewDecision
);

reviewsRouter.post(
  '/reviews/:assessmentId',
  requireAuth,
  requireRoles(ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  handleRecordReviewDecision
);

reviewsRouter.patch(
  '/growth-assessments/:id/review',
  requireAuth,
  requireRoles(ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  handleRecordReviewDecision
);

async function buildMonitoringResponse(user, { sessionId = null, requestedOrgId = null, periodQuery = null }) {
  const allowedPosyanduIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
  if (allowedPosyanduIds.length === 0) {
    return {
      period: '2026-11',
      session: null,
      summary: {
        total_active_children: 0,
        measured_complete_count: 0,
        present_incomplete_count: 0,
        draft_count: 0,
        unmeasured_count: 0,
        coverage_percent: 0,
        attendance_percent: 0,
        low_coverage_warning: false
      },
      presentIncomplete: [],
      draftMeasurements: [],
      unmeasuredChildren: []
    };
  }

  let targetIds = allowedPosyanduIds;
  let selectedSession = null;
  let period = periodQuery ? String(periodQuery).slice(0, 7) : null;

  if (sessionId) {
    const [sessRows] = await pool.query(
      `SELECT s.*, o.name AS posyandu_name, o.code AS posyandu_code
       FROM posyandu_sessions s
       INNER JOIN organizations o ON o.id = s.organization_id
       WHERE s.id = ?
       LIMIT 1`,
      [sessionId]
    );
    if (sessRows.length === 0) {
      throw AppError.notFound('Sesi Posyandu tidak ditemukan.');
    }
    const sess = sessRows[0];
    await AccessPolicy.assertPosyanduAccess(user, sess.organization_id);
    targetIds = [Number(sess.organization_id)];
    const sDate = formatDateOnly(sess.session_date);
    period = sDate.slice(0, 7);
    selectedSession = {
      id: Number(sess.id),
      organization_id: Number(sess.organization_id),
      posyandu_name: sess.posyandu_name,
      posyandu_code: sess.posyandu_code,
      session_date: sDate,
      status: sess.status
    };
  } else if (requestedOrgId) {
    if (!allowedPosyanduIds.includes(requestedOrgId)) {
      throw AppError.forbidden('Posyandu berada di luar cakupan wilayah Anda.');
    }
    targetIds = [requestedOrgId];
  }

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    const [latestSession] = await pool.query(
      `SELECT DATE_FORMAT(MAX(session_date), '%Y-%m') AS latest_period
       FROM posyandu_sessions
       WHERE organization_id IN (${targetIds.map(() => '?').join(',')})`,
      targetIds
    );
    period = latestSession[0]?.latest_period || new Date().toISOString().slice(0, 7);
  }

  const [activeChildren] = await pool.query(
    `SELECT
      c.id,
      c.organization_id,
      o.name AS posyandu_name,
      o.code AS posyandu_code,
      c.internal_code,
      c.name,
      c.birth_date,
      c.sex,
      g.name AS guardian_name,
      g.phone AS guardian_phone
     FROM children c
     INNER JOIN organizations o ON o.id = c.organization_id
     LEFT JOIN guardians g ON g.id = c.guardian_id
     WHERE c.inactive_on IS NULL
       AND c.organization_id IN (${targetIds.map(() => '?').join(',')})
     ORDER BY o.code ASC, c.name ASC`,
    targetIds
  );

  let attSql = `
    SELECT
      a.id AS attendance_id,
      a.child_id,
      a.status AS attendance_status,
      s.id AS session_id,
      s.session_date,
      s.organization_id,
      m.id AS measurement_id,
      m.status AS measurement_status,
      m.weight_kg,
      m.length_height_cm
     FROM attendances a
     INNER JOIN posyandu_sessions s ON s.id = a.session_id
     LEFT JOIN measurements m ON m.attendance_id = a.id AND m.status IN ('submitted', 'draft')
  `;
  const attParams = [];
  if (sessionId) {
    attSql += ' WHERE s.id = ?';
    attParams.push(sessionId);
  } else {
    attSql += ` WHERE DATE_FORMAT(s.session_date, '%Y-%m') = ?
      AND s.organization_id IN (${targetIds.map(() => '?').join(',')})`;
    attParams.push(period, ...targetIds);
  }
  attSql += ' ORDER BY s.session_date DESC';

  const [periodAttendances] = await pool.query(attSql, attParams);

  const childStatusMap = new Map();
  for (const row of periodAttendances) {
    const cid = Number(row.child_id);
    const current = childStatusMap.get(cid);
    if (row.measurement_status === 'submitted') {
      childStatusMap.set(cid, { state: 'complete', row });
    } else if (!current && row.attendance_status === 'present') {
      childStatusMap.set(cid, { state: 'present_incomplete', row });
    } else if (!current) {
      childStatusMap.set(cid, { state: 'absent_unmeasured', row });
    }
  }

  let measuredCompleteCount = 0;
  let draftOnlyCount = 0;
  let presentTotalCount = 0;
  const presentIncomplete = [];
  const draftMeasurements = [];
  const unmeasuredChildren = [];

  for (const child of activeChildren) {
    const cid = Number(child.id);
    const st = childStatusMap.get(cid);
    const baseChild = {
      child_id: cid,
      organization_id: Number(child.organization_id),
      posyandu_name: child.posyandu_name,
      posyandu_code: child.posyandu_code,
      internal_code: child.internal_code,
      child_name: child.name,
      birth_date: formatDateOnly(child.birth_date),
      sex: child.sex,
      guardian_name: child.guardian_name || '-',
      guardian_phone: child.guardian_phone || ''
    };

    if (st?.state === 'complete') {
      measuredCompleteCount++;
      presentTotalCount++;
    } else if (st?.state === 'present_incomplete') {
      presentTotalCount++;
      const itemObj = {
        ...baseChild,
        session_id: Number(st.row.session_id),
        session_date: formatDateOnly(st.row.session_date),
        attendance_id: Number(st.row.attendance_id),
        measurement_id: st.row.measurement_id ? Number(st.row.measurement_id) : null,
        measurement_status: st.row.measurement_status || 'belum_diinput',
        weight_kg: st.row.weight_kg !== null ? Number(st.row.weight_kg) : null,
        length_height_cm: st.row.length_height_cm !== null ? Number(st.row.length_height_cm) : null
      };
      presentIncomplete.push(itemObj);
      if (st.row.measurement_status === 'draft') {
        draftOnlyCount++;
        draftMeasurements.push(itemObj);
      }
    } else {
      unmeasuredChildren.push({
        ...baseChild,
        attendance_status: st?.row?.attendance_status || 'belum_hadir',
        session_id: st?.row?.session_id
          ? Number(st.row.session_id)
          : selectedSession?.id || null,
        session_date: st?.row?.session_date
          ? formatDateOnly(st.row.session_date)
          : selectedSession?.session_date || null
      });
    }
  }

  const totalActive = activeChildren.length;
  const coveragePercent =
    totalActive > 0 ? Number(((measuredCompleteCount / totalActive) * 100).toFixed(1)) : 0;
  const attendancePercent =
    totalActive > 0 ? Number(((presentTotalCount / totalActive) * 100).toFixed(1)) : 0;
  const lowCoverageWarning = totalActive > 0 && (coveragePercent < 80 || attendancePercent < 80);

  return {
    period,
    session: selectedSession,
    summary: {
      total_active_children: totalActive,
      measured_complete_count: measuredCompleteCount,
      present_incomplete_count: presentIncomplete.length,
      draft_count: draftOnlyCount,
      unmeasured_count: unmeasuredChildren.length,
      coverage_percent: coveragePercent,
      attendance_percent: attendancePercent,
      low_coverage_warning: lowCoverageWarning
    },
    presentIncomplete,
    draftMeasurements,
    unmeasuredChildren
  };
}

reviewsRouter.get(
  '/sessions/:sessionId/monitoring',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  async (req, res, next) => {
    try {
      const sessionId = Number(req.params.sessionId);
      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        throw AppError.badRequest('ID sesi tidak valid.');
      }
      const data = await buildMonitoringResponse(req.user, { sessionId });
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
);

reviewsRouter.get(
  '/monitoring/completeness',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  async (req, res, next) => {
    try {
      const sessionId = req.query.session_id ? Number(req.query.session_id) : null;
      const requestedOrgId = req.query.organization_id ? Number(req.query.organization_id) : null;
      const periodQuery = req.query.period || null;
      const data = await buildMonitoringResponse(req.user, {
        sessionId,
        requestedOrgId,
        periodQuery
      });
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
);
