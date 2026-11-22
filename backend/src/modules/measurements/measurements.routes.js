import { randomUUID } from 'node:crypto';
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
  evaluateGrowth,
  getRecommendedPosition,
  CLINICAL_DISCLAIMER
} from '../../services/growthCalculator.js';
import { getActiveReferenceVersionId } from '../../services/referenceService.js';

export const measurementsRouter = Router();

const authMeasurementRoles = [
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS)
];

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

function assertNotFutureDate(measuredAtStr) {
  if (!measuredAtStr) return;
  const datePart = String(measuredAtStr).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (datePart > todayStr) {
    throw AppError.validationError('Tanggal pengukuran tidak boleh berada di masa depan.', {
      measured_at: 'Tanggal ukur tidak boleh melebihi hari ini.'
    });
  }
}

function mapMeasurementRow(m) {
  return {
    id: Number(m.id),
    attendance_id: Number(m.attendance_id),
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
    request_token: m.request_token,
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
          reviewed_by: m.reviewed_by ? Number(m.reviewed_by) : null,
          reviewed_by_name: m.reviewed_by_name || null,
          reviewed_at: m.reviewed_at || null,
          review_note: m.review_note
        }
      : null
  };
}

measurementsRouter.get('/measurements/attendance/:attendanceId', ...authMeasurementRoles, async (req, res, next) => {
  try {
    const attendanceId = Number(req.params.attendanceId);
    const [attRows] = await pool.query(
      `SELECT
        a.id AS attendance_id,
        a.session_id,
        a.child_id,
        a.status AS attendance_status,
        s.organization_id,
        s.session_date,
        s.status AS session_status,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        c.internal_code,
        c.name AS child_name,
        c.birth_date,
        c.sex,
        g.name AS guardian_name
       FROM attendances a
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       INNER JOIN organizations o ON o.id = s.organization_id
       INNER JOIN children c ON c.id = a.child_id
       LEFT JOIN guardians g ON g.id = c.guardian_id
       WHERE a.id = ?
       LIMIT 1`,
      [attendanceId]
    );

    if (attRows.length === 0) {
      throw AppError.notFound('Data kehadiran tidak ditemukan.');
    }

    const att = attRows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, att.organization_id);

    const [mRows] = await pool.query(
      `SELECT
        m.*,
        u.name AS created_by_name,
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
       INNER JOIN users u ON u.id = m.created_by
       LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
       LEFT JOIN users ru ON ru.id = ga.reviewed_by
       WHERE m.attendance_id = ?
       ORDER BY m.revision_no DESC, m.id DESC`,
      [attendanceId]
    );

    const birthStr = formatDateOnly(att.birth_date);
    const sessionDateStr = formatDateOnly(att.session_date);
    const ageDaysAtSession = Math.max(0, calculateAgeDays(birthStr, sessionDateStr));

    const formattedMeasurements = mRows.map(mapMeasurementRow);

    const activeMeasurement =
      formattedMeasurements.find((m) => m.status === 'submitted') ||
      formattedMeasurements.find((m) => m.status === 'draft') ||
      null;

    return sendSuccess(res, {
      attendance: {
        id: Number(att.attendance_id),
        session_id: Number(att.session_id),
        session_date: sessionDateStr,
        session_status: att.session_status,
        attendance_status: att.attendance_status,
        organization_id: Number(att.organization_id),
        posyandu_name: att.posyandu_name,
        posyandu_code: att.posyandu_code
      },
      child: {
        id: Number(att.child_id),
        internal_code: att.internal_code,
        name: att.child_name,
        birth_date: birthStr,
        sex: att.sex,
        guardian_name: att.guardian_name || '-',
        age_days_at_session: ageDaysAtSession,
        age_months_at_session: Number((ageDaysAtSession / 30.4375).toFixed(1)),
        recommended_position: getRecommendedPosition(ageDaysAtSession)
      },
      activeMeasurement,
      revisions: formattedMeasurements,
      disclaimer: CLINICAL_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
});

measurementsRouter.get('/measurements/:id', ...authMeasurementRoles, async (req, res, next) => {
  try {
    const measurementId = Number(req.params.id);
    if (!Number.isInteger(measurementId) || measurementId <= 0) {
      throw AppError.badRequest('ID pengukuran tidak valid.');
    }

    const [rows] = await pool.query(
      `SELECT
        m.*,
        u.name AS created_by_name,
        a.session_id,
        a.child_id,
        a.status AS attendance_status,
        s.organization_id,
        s.session_date,
        s.status AS session_status,
        o.name AS posyandu_name,
        o.code AS posyandu_code,
        c.internal_code,
        c.name AS child_name,
        c.birth_date,
        c.sex,
        g.name AS guardian_name,
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
       INNER JOIN users u ON u.id = m.created_by
       INNER JOIN attendances a ON a.id = m.attendance_id
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       INNER JOIN organizations o ON o.id = s.organization_id
       INNER JOIN children c ON c.id = a.child_id
       LEFT JOIN guardians g ON g.id = c.guardian_id
       LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
       LEFT JOIN users ru ON ru.id = ga.reviewed_by
       WHERE m.id = ?
       LIMIT 1`,
      [measurementId]
    );

    if (rows.length === 0) {
      throw AppError.notFound('Catatan pengukuran tidak ditemukan.');
    }

    const row = rows[0];
    await AccessPolicy.assertPosyanduAccess(req.user, row.organization_id);

    const [historyRows] = await pool.query(
      `SELECT
        m.*,
        u.name AS created_by_name,
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
       INNER JOIN users u ON u.id = m.created_by
       LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
       LEFT JOIN users ru ON ru.id = ga.reviewed_by
       WHERE m.attendance_id = ?
       ORDER BY m.revision_no DESC, m.id DESC`,
      [row.attendance_id]
    );

    const birthStr = formatDateOnly(row.birth_date);
    const sessionDateStr = formatDateOnly(row.session_date);
    const ageDaysAtSession = Math.max(0, calculateAgeDays(birthStr, sessionDateStr));

    return sendSuccess(res, {
      measurement: {
        ...mapMeasurementRow(row),
        session_id: Number(row.session_id),
        session_date: sessionDateStr,
        session_status: row.session_status,
        organization_id: Number(row.organization_id),
        posyandu_name: row.posyandu_name,
        posyandu_code: row.posyandu_code
      },
      child: {
        id: Number(row.child_id),
        internal_code: row.internal_code,
        name: row.child_name,
        birth_date: birthStr,
        sex: row.sex,
        guardian_name: row.guardian_name || '-',
        age_days_at_session: ageDaysAtSession,
        age_months_at_session: Number((ageDaysAtSession / 30.4375).toFixed(1))
      },
      revision_history: historyRows.map(mapMeasurementRow),
      disclaimer: CLINICAL_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
});

const previewSchema = z.object({
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  measured_at: z.string().min(10),
  sex: z.enum(['L', 'P']),
  length_height_cm: z.number().positive(),
  position: z.enum(['recumbent', 'standing'])
});

measurementsRouter.post('/measurements/preview', ...authMeasurementRoles, verifyCsrf, async (req, res, next) => {
  try {
    const payload = previewSchema.parse({
      ...req.body,
      length_height_cm: Number(req.body?.length_height_cm)
    });

    const result = evaluateGrowth({
      birthDate: payload.birth_date,
      measuredAt: payload.measured_at,
      sex: payload.sex,
      lengthHeightCm: payload.length_height_cm,
      position: payload.position
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

const draftSchema = z.object({
  attendance_id: z.number().int().positive(),
  measured_at: z.string().optional(),
  weight_kg: z.number().positive().max(60).nullable().optional(),
  length_height_cm: z.number().positive().max(160).nullable().optional(),
  position: z.enum(['recumbent', 'standing']).optional(),
  request_token: z.string().trim().min(6).max(64).optional()
});

async function handleSaveDraft(req, res, next) {
  try {
    const attendanceIdRaw = req.params.attendanceId ?? req.body?.attendance_id;
    const payload = draftSchema.parse({
      ...req.body,
      attendance_id: Number(attendanceIdRaw),
      weight_kg:
        req.body?.weight_kg !== undefined && req.body?.weight_kg !== '' && req.body?.weight_kg !== null
          ? Number(req.body.weight_kg)
          : null,
      length_height_cm:
        req.body?.length_height_cm !== undefined &&
        req.body?.length_height_cm !== '' &&
        req.body?.length_height_cm !== null
          ? Number(req.body.length_height_cm)
          : null
    });

    if (payload.measured_at) {
      assertNotFutureDate(payload.measured_at);
    }

    const savedDraft = await withTransaction(async (conn) => {
      const [attRows] = await conn.query(
        `SELECT a.id, a.status, s.organization_id, s.session_date, c.birth_date
         FROM attendances a
         INNER JOIN posyandu_sessions s ON s.id = a.session_id
         INNER JOIN children c ON c.id = a.child_id
         WHERE a.id = ?
         FOR UPDATE`,
        [payload.attendance_id]
      );

      if (attRows.length === 0) {
        throw AppError.notFound('Data kehadiran tidak ditemukan.');
      }

      const att = attRows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, att.organization_id, conn);

      if (att.status !== 'present') {
        throw AppError.badRequest('Pengukuran hanya dapat dicatat untuk anak yang berstatus hadir.');
      }

      const [submittedCheck] = await conn.query(
        "SELECT id FROM measurements WHERE attendance_id = ? AND status = 'submitted' LIMIT 1",
        [payload.attendance_id]
      );
      if (submittedCheck.length > 0) {
        throw AppError.conflict('Pengukuran untuk kehadiran ini sudah dikirim dan tidak dapat diubah menjadi draf.');
      }

      const ageDays = Math.max(
        0,
        calculateAgeDays(formatDateOnly(att.birth_date), formatDateOnly(att.session_date))
      );
      const position = payload.position || getRecommendedPosition(ageDays);
      const measuredAt = payload.measured_at || `${formatDateOnly(att.session_date)} 09:00:00`;

      const [existingDraft] = await conn.query(
        "SELECT id, request_token FROM measurements WHERE attendance_id = ? AND status = 'draft' LIMIT 1",
        [payload.attendance_id]
      );

      let measurementId;
      let tokenUsed;

      if (existingDraft.length > 0) {
        measurementId = Number(existingDraft[0].id);
        tokenUsed = existingDraft[0].request_token;
        await conn.query(
          `UPDATE measurements
           SET measured_at = ?, weight_kg = ?, length_height_cm = ?, position = ?, created_by = ?
           WHERE id = ?`,
          [
            measuredAt,
            payload.weight_kg,
            payload.length_height_cm,
            position,
            req.user.id,
            measurementId
          ]
        );
      } else {
        tokenUsed = payload.request_token || `draft-${randomUUID()}`;
        const [ins] = await conn.query(
          `INSERT INTO measurements
            (attendance_id, revision_no, measured_at, weight_kg, length_height_cm, position, status, created_by, request_token)
           VALUES (?, 1, ?, ?, ?, ?, 'draft', ?, ?)`,
          [
            payload.attendance_id,
            measuredAt,
            payload.weight_kg,
            payload.length_height_cm,
            position,
            req.user.id,
            tokenUsed
          ]
        );
        measurementId = Number(ins.insertId);
      }

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(att.organization_id),
          action: 'MEASUREMENT_DRAFT_SAVED',
          entityType: 'measurement',
          entityId: measurementId,
          requestId: req.requestId,
          changeSummary: `Menyimpan draf pengukuran pada kehadiran #${payload.attendance_id}.`
        },
        conn
      );

      return {
        id: measurementId,
        attendance_id: payload.attendance_id,
        revision_no: 1,
        supersedes_id: null,
        status: 'draft',
        weight_kg: payload.weight_kg,
        length_height_cm: payload.length_height_cm,
        position,
        measured_at: measuredAt,
        request_token: tokenUsed
      };
    });

    return sendSuccess(res, savedDraft);
  } catch (err) {
    next(err);
  }
}

measurementsRouter.post('/measurements/draft', ...authMeasurementRoles, verifyCsrf, handleSaveDraft);
measurementsRouter.post('/attendances/:attendanceId/measurements/drafts', ...authMeasurementRoles, verifyCsrf, handleSaveDraft);

async function handleDeleteDraft(req, res, next) {
  try {
    const draftId = Number(req.params.id);
    if (!Number.isInteger(draftId) || draftId <= 0) {
      throw AppError.badRequest('ID draf pengukuran tidak valid.');
    }

    const deletedInfo = await withTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT
          m.id,
          m.attendance_id,
          m.status,
          s.organization_id,
          c.internal_code,
          c.name AS child_name,
          ga.id AS assessment_id
         FROM measurements m
         INNER JOIN attendances a ON a.id = m.attendance_id
         INNER JOIN posyandu_sessions s ON s.id = a.session_id
         INNER JOIN children c ON c.id = a.child_id
         LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
         WHERE m.id = ?
         FOR UPDATE`,
        [draftId]
      );

      if (rows.length === 0) {
        throw AppError.notFound('Data draf pengukuran tidak ditemukan.');
      }

      const m = rows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, m.organization_id, conn);

      if (m.status !== 'draft' || m.assessment_id !== null) {
        throw new AppError(
          'Hanya pengukuran berstatus draf yang belum tervalidasi yang dapat dibatalkan/dihapus. Pengukuran submitted bersifat permanen.',
          400,
          'CANNOT_DELETE_SUBMITTED_MEASUREMENT'
        );
      }

      await conn.query('DELETE FROM measurements WHERE id = ? AND status = ?', [draftId, 'draft']);

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(m.organization_id),
          action: 'MEASUREMENT_DRAFT_DELETED',
          entityType: 'measurement',
          entityId: draftId,
          requestId: req.requestId,
          changeSummary: `Membatalkan dan menghapus draf pengukuran #${draftId} untuk balita [${m.internal_code}] ${m.child_name}.`
        },
        conn
      );

      return {
        id: draftId,
        deleted_id: draftId,
        attendance_id: Number(m.attendance_id),
        deleted: true
      };
    });

    return sendSuccess(res, deletedInfo);
  } catch (err) {
    next(err);
  }
}

measurementsRouter.delete('/measurements/drafts/:id', ...authMeasurementRoles, verifyCsrf, handleDeleteDraft);
measurementsRouter.delete('/measurements/:id/draft', ...authMeasurementRoles, verifyCsrf, handleDeleteDraft);

const submitSchema = z.object({
  attendance_id: z.number().int().positive('Kehadiran anak wajib dipilih.'),
  measured_at: z.string().optional(),
  weight_kg: z
    .number({ invalid_type_error: 'Berat badan wajib berupa angka.' })
    .min(1.0, 'Berat badan minimal 1.0 kg.')
    .max(50.0, 'Berat badan maksimal 50.0 kg.'),
  length_height_cm: z
    .number({ invalid_type_error: 'Panjang/tinggi badan wajib berupa angka.' })
    .min(25.0, 'Panjang/tinggi badan minimal 25.0 cm.')
    .max(150.0, 'Panjang/tinggi badan maksimal 150.0 cm.'),
  position: z.enum(['recumbent', 'standing']),
  request_token: z.string().trim().min(6).max(64).optional()
});

async function handleSubmitMeasurement(req, res, next) {
  try {
    const attendanceIdRaw = req.params.attendanceId ?? req.body?.attendance_id;
    const payload = submitSchema.parse({
      ...req.body,
      attendance_id: Number(attendanceIdRaw),
      weight_kg: Number(req.body?.weight_kg),
      length_height_cm: Number(req.body?.length_height_cm)
    });

    if (payload.measured_at) {
      assertNotFutureDate(payload.measured_at);
    }

    const requestToken = payload.request_token || randomUUID();

    const txResult = await withTransaction(async (conn) => {
      const [tokenRows] = await conn.query(
        `SELECT
          m.*,
          s.organization_id,
          ga.id AS assessment_id,
          ga.age_days,
          ga.adjustment_cm,
          ga.adjusted_length_height_cm,
          ga.z_score,
          ga.category,
          ga.quality_status,
          ga.review_status,
          ga.review_reason
         FROM measurements m
         INNER JOIN attendances a ON a.id = m.attendance_id
         INNER JOIN posyandu_sessions s ON s.id = a.session_id
         LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
         WHERE m.request_token = ?
         LIMIT 1`,
        [requestToken]
      );

      if (tokenRows.length > 0 && tokenRows[0].status === 'submitted') {
        await AccessPolicy.assertPosyanduAccess(req.user, tokenRows[0].organization_id, conn);
        const existing = tokenRows[0];
        return {
          idempotentReplay: true,
          measurement: {
            id: Number(existing.id),
            attendance_id: Number(existing.attendance_id),
            revision_no: Number(existing.revision_no),
            supersedes_id: existing.supersedes_id ? Number(existing.supersedes_id) : null,
            status: existing.status,
            weight_kg: Number(existing.weight_kg),
            length_height_cm: Number(existing.length_height_cm),
            position: existing.position,
            measured_at: existing.measured_at,
            request_token: existing.request_token
          },
          assessment: {
            id: Number(existing.assessment_id),
            age_days: Number(existing.age_days),
            adjustment_cm: Number(existing.adjustment_cm),
            adjusted_length_height_cm: Number(existing.adjusted_length_height_cm),
            z_score: Number(existing.z_score),
            category: existing.category,
            quality_status: existing.quality_status,
            review_status: existing.review_status,
            review_reason: existing.review_reason,
            disclaimer: CLINICAL_DISCLAIMER
          }
        };
      }

      const [attRows] = await conn.query(
        `SELECT
          a.id,
          a.status AS attendance_status,
          s.organization_id,
          s.session_date,
          c.id AS child_id,
          c.internal_code,
          c.birth_date,
          c.sex
         FROM attendances a
         INNER JOIN posyandu_sessions s ON s.id = a.session_id
         INNER JOIN children c ON c.id = a.child_id
         WHERE a.id = ?
         FOR UPDATE`,
        [payload.attendance_id]
      );

      if (attRows.length === 0) {
        throw AppError.notFound('Data kehadiran tidak ditemukan.');
      }

      const att = attRows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, att.organization_id, conn);

      if (att.attendance_status !== 'present') {
        throw AppError.badRequest('Pengukuran hanya dapat dikirim untuk anak yang tercatat hadir.');
      }

      const [existingSubmitted] = await conn.query(
        "SELECT id FROM measurements WHERE attendance_id = ? AND status = 'submitted' LIMIT 1",
        [payload.attendance_id]
      );
      if (existingSubmitted.length > 0) {
        throw AppError.conflict(
          'Pengukuran untuk kehadiran ini sudah dikirim. Gunakan menu Koreksi untuk merevisi nilai ukur.'
        );
      }

      const birthStr = formatDateOnly(att.birth_date);
      const sessionDateStr = formatDateOnly(att.session_date);
      const measuredAt = payload.measured_at || `${sessionDateStr} 09:00:00`;
      assertNotFutureDate(measuredAt);

      const calc = evaluateGrowth({
        birthDate: birthStr,
        measuredAt,
        sex: att.sex,
        lengthHeightCm: payload.length_height_cm,
        position: payload.position
      });

      const [existingDraft] = await conn.query(
        "SELECT id FROM measurements WHERE attendance_id = ? AND status = 'draft' LIMIT 1",
        [payload.attendance_id]
      );

      let measurementId;
      if (existingDraft.length > 0) {
        measurementId = Number(existingDraft[0].id);
        await conn.query(
          `UPDATE measurements
           SET measured_at = ?,
               weight_kg = ?,
               length_height_cm = ?,
               position = ?,
               status = 'submitted',
               created_by = ?,
               request_token = ?
           WHERE id = ?`,
          [
            measuredAt,
            payload.weight_kg,
            payload.length_height_cm,
            payload.position,
            req.user.id,
            requestToken,
            measurementId
          ]
        );
      } else {
        const [ins] = await conn.query(
          `INSERT INTO measurements
            (attendance_id, revision_no, measured_at, weight_kg, length_height_cm, position, status, created_by, request_token)
           VALUES (?, 1, ?, ?, ?, ?, 'submitted', ?, ?)`,
          [
            payload.attendance_id,
            measuredAt,
            payload.weight_kg,
            payload.length_height_cm,
            payload.position,
            req.user.id,
            requestToken
          ]
        );
        measurementId = Number(ins.insertId);
      }

      const refVersionId = await getActiveReferenceVersionId(conn);
      const [gaRes] = await conn.query(
        `INSERT INTO growth_assessments
          (measurement_id, reference_version_id, birth_date_used, sex_used, age_days,
           adjustment_cm, adjusted_length_height_cm, z_score, category,
           quality_status, review_reason, review_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          measurementId,
          refVersionId,
          birthStr,
          att.sex,
          calc.ageDays,
          calc.adjustmentCm,
          calc.adjustedLengthHeightCm,
          calc.zScore,
          calc.category,
          calc.qualityStatus,
          calc.reviewReason,
          calc.reviewStatus
        ]
      );
      const assessmentId = Number(gaRes.insertId);

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(att.organization_id),
          action: 'MEASUREMENT_SUBMITTED',
          entityType: 'measurement',
          entityId: measurementId,
          requestId: req.requestId,
          changeSummary: `Mengirim pengukuran [${att.internal_code}] Z=${calc.zScore} (${calc.category}).`
        },
        conn
      );

      return {
        idempotentReplay: false,
        measurement: {
          id: measurementId,
          attendance_id: payload.attendance_id,
          revision_no: 1,
          supersedes_id: null,
          status: 'submitted',
          weight_kg: payload.weight_kg,
          length_height_cm: payload.length_height_cm,
          position: payload.position,
          measured_at: measuredAt,
          request_token: requestToken
        },
        assessment: {
          id: assessmentId,
          age_days: calc.ageDays,
          age_months: calc.ageMonthsApprox,
          adjustment_cm: calc.adjustmentCm,
          adjusted_length_height_cm: calc.adjustedLengthHeightCm,
          z_score: calc.zScore,
          category: calc.category,
          quality_status: calc.qualityStatus,
          review_status: calc.reviewStatus,
          review_reason: calc.reviewReason,
          disclaimer: CLINICAL_DISCLAIMER
        }
      };
    });

    return sendSuccess(
      res,
      {
        measurement: txResult.measurement,
        assessment: txResult.assessment
      },
      txResult.idempotentReplay ? 200 : 201,
      txResult.idempotentReplay ? { idempotentReplay: true } : {}
    );
  } catch (err) {
    next(err);
  }
}

measurementsRouter.post('/measurements/submit', ...authMeasurementRoles, verifyCsrf, handleSubmitMeasurement);
measurementsRouter.post('/attendances/:attendanceId/measurements/submit', ...authMeasurementRoles, verifyCsrf, handleSubmitMeasurement);

const reviseSchema = z.object({
  weight_kg: z.number().min(1.0).max(50.0),
  length_height_cm: z.number().min(25.0).max(150.0),
  position: z.enum(['recumbent', 'standing']),
  correction_reason: z
    .string()
    .trim()
    .min(5, 'Alasan koreksi wajib diisi minimal 5 karakter.')
    .max(500),
  expected_revision_no: z.number().int().positive().optional(),
  request_token: z.string().trim().min(6).max(64).optional()
});

async function handleReviseMeasurement(req, res, next) {
  try {
    const oldMeasurementId = Number(req.params.id);
    if (!Number.isInteger(oldMeasurementId) || oldMeasurementId <= 0) {
      throw AppError.badRequest('ID pengukuran tidak valid.');
    }

    const payload = reviseSchema.parse({
      ...req.body,
      weight_kg: Number(req.body?.weight_kg),
      length_height_cm: Number(req.body?.length_height_cm),
      expected_revision_no:
        req.body?.expected_revision_no !== undefined && req.body?.expected_revision_no !== null
          ? Number(req.body.expected_revision_no)
          : undefined
    });

    const requestToken = payload.request_token || randomUUID();

    const revisedResult = await withTransaction(async (conn) => {
      const [oldRows] = await conn.query(
        `SELECT
          m.*,
          s.organization_id,
          c.id AS child_id,
          c.internal_code,
          c.birth_date,
          c.sex,
          ga.id AS old_assessment_id
         FROM measurements m
         INNER JOIN attendances a ON a.id = m.attendance_id
         INNER JOIN posyandu_sessions s ON s.id = a.session_id
         INNER JOIN children c ON c.id = a.child_id
         LEFT JOIN growth_assessments ga ON ga.measurement_id = m.id
         WHERE m.id = ?
         FOR UPDATE`,
        [oldMeasurementId]
      );

      if (oldRows.length === 0) {
        throw AppError.notFound('Data pengukuran yang akan direvisi tidak ditemukan.');
      }

      const oldM = oldRows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, oldM.organization_id, conn);

      if (oldM.status === 'voided') {
        throw AppError.conflict(
          'Versi pengukuran ini sudah voided dan telah digantikan oleh revisi lain.',
          'OPTIMISTIC_LOCK_CONFLICT'
        );
      }
      if (oldM.status !== 'submitted') {
        throw AppError.conflict('Hanya pengukuran berstatus submitted yang dapat direvisi.');
      }

      if (
        payload.expected_revision_no !== undefined &&
        Number(oldM.revision_no) !== payload.expected_revision_no
      ) {
        throw AppError.conflict(
          `Konflik versi pengukuran (expected rev #${payload.expected_revision_no}, aktual rev #${oldM.revision_no}). Muat ulang data terbaru.`,
          'OPTIMISTIC_LOCK_CONFLICT'
        );
      }

      const birthStr = formatDateOnly(oldM.birth_date);
      const calc = evaluateGrowth({
        birthDate: birthStr,
        measuredAt: oldM.measured_at,
        sex: oldM.sex,
        lengthHeightCm: payload.length_height_cm,
        position: payload.position
      });

      await conn.query("UPDATE measurements SET status = 'voided' WHERE id = ?", [oldMeasurementId]);

      const nextRevisionNo = Number(oldM.revision_no) + 1;
      const [insM] = await conn.query(
        `INSERT INTO measurements
          (attendance_id, revision_no, supersedes_id, measured_at, weight_kg, length_height_cm,
           position, status, correction_reason, created_by, request_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`,
        [
          oldM.attendance_id,
          nextRevisionNo,
          oldMeasurementId,
          oldM.measured_at,
          payload.weight_kg,
          payload.length_height_cm,
          payload.position,
          payload.correction_reason,
          req.user.id,
          requestToken
        ]
      );
      const newMeasurementId = Number(insM.insertId);

      const refVersionId = await getActiveReferenceVersionId(conn);
      const [insGa] = await conn.query(
        `INSERT INTO growth_assessments
          (measurement_id, reference_version_id, birth_date_used, sex_used, age_days,
           adjustment_cm, adjusted_length_height_cm, z_score, category,
           quality_status, review_reason, review_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newMeasurementId,
          refVersionId,
          birthStr,
          oldM.sex,
          calc.ageDays,
          calc.adjustmentCm,
          calc.adjustedLengthHeightCm,
          calc.zScore,
          calc.category,
          calc.qualityStatus,
          calc.reviewReason,
          calc.reviewStatus
        ]
      );
      const newAssessmentId = Number(insGa.insertId);

      if (oldM.old_assessment_id) {
        const [activeFollowUps] = await conn.query(
          "SELECT id FROM follow_ups WHERE assessment_id = ? AND status IN ('open', 'in_progress') FOR UPDATE",
          [oldM.old_assessment_id]
        );

        for (const fu of activeFollowUps) {
          await conn.query('UPDATE follow_ups SET assessment_id = ? WHERE id = ?', [
            newAssessmentId,
            fu.id
          ]);
          await conn.query(
            `INSERT INTO follow_up_updates (follow_up_id, actor_id, activity_at, note, result)
             VALUES (?, ?, CURRENT_TIMESTAMP, ?, 'system_revision_notice')`,
            [
              fu.id,
              req.user.id,
              `Sistem: Pengukuran direvisi ke Rev #${nextRevisionNo} (Z-Score baru: ${calc.zScore}, kategori: ${calc.category}). Alasan: ${payload.correction_reason}`
            ]
          );
        }
      }

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(oldM.organization_id),
          action: 'MEASUREMENT_REVISED',
          entityType: 'measurement',
          entityId: newMeasurementId,
          requestId: req.requestId,
          changeSummary: `Merevisi pengukuran [${oldM.internal_code}] dari #${oldMeasurementId} ke #${newMeasurementId} (Rev ${nextRevisionNo}, Z=${calc.zScore}).`
        },
        conn
      );

      return {
        voided_measurement_id: oldMeasurementId,
        measurement: {
          id: newMeasurementId,
          attendance_id: Number(oldM.attendance_id),
          revision_no: nextRevisionNo,
          supersedes_id: oldMeasurementId,
          status: 'submitted',
          weight_kg: payload.weight_kg,
          length_height_cm: payload.length_height_cm,
          position: payload.position,
          correction_reason: payload.correction_reason,
          measured_at: oldM.measured_at
        },
        assessment: {
          id: newAssessmentId,
          age_days: calc.ageDays,
          adjustment_cm: calc.adjustmentCm,
          adjusted_length_height_cm: calc.adjustedLengthHeightCm,
          z_score: calc.zScore,
          category: calc.category,
          quality_status: calc.qualityStatus,
          review_status: calc.reviewStatus,
          review_reason: calc.reviewReason,
          disclaimer: CLINICAL_DISCLAIMER
        }
      };
    });

    return sendSuccess(res, revisedResult, 201);
  } catch (err) {
    next(err);
  }
}

measurementsRouter.post('/measurements/:id/revisions', ...authMeasurementRoles, verifyCsrf, handleReviseMeasurement);
measurementsRouter.post('/measurements/:id/revise', ...authMeasurementRoles, verifyCsrf, handleReviseMeasurement);
