import { Router } from 'express';
import { z } from 'zod';
import { pool, withTransaction } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles, verifyCsrf } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';

export const followupsRouter = Router();

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

function resolveInterventionCategory(dbType, description = '') {
  const desc = String(description || '');
  const match = /^\[Kategori:\s*([^\]]+)\]\s*/i.exec(desc);
  if (match) {
    return match[1].trim();
  }
  if (dbType === 'clinical_review') return 'Konseling Gizi';
  if (dbType === 'remeasurement') return 'Pengukuran Ulang';
  return 'Kunjungan Rumah';
}

function normalizeFollowUpTypeInput(rawType, rawCategory) {
  const input = String(rawCategory || rawType || 'operational_measurement').trim();
  if (input === 'clinical_review') {
    return { dbType: 'clinical_review', categoryLabel: 'Konseling Gizi' };
  }
  if (input === 'remeasurement') {
    return { dbType: 'remeasurement', categoryLabel: 'Pengukuran Ulang' };
  }
  if (input === 'operational_measurement') {
    return { dbType: 'operational_measurement', categoryLabel: 'Kunjungan Rumah' };
  }

  const lower = input.toLowerCase();
  if (lower.includes('konseling')) {
    return { dbType: 'clinical_review', categoryLabel: 'Konseling Gizi' };
  }
  if (lower.includes('pmt')) {
    return { dbType: 'clinical_review', categoryLabel: 'Pemberian PMT' };
  }
  if (lower.includes('rujukan')) {
    return { dbType: 'clinical_review', categoryLabel: 'Rujukan Puskesmas' };
  }
  if (lower.includes('ukur')) {
    return { dbType: 'remeasurement', categoryLabel: 'Pengukuran Ulang' };
  }
  if (lower.includes('kunjungan')) {
    return { dbType: 'operational_measurement', categoryLabel: 'Kunjungan Rumah' };
  }

  throw AppError.validationError('Kategori intervensi tindak lanjut tidak valid.', {
    type: 'Pilih kategori intervensi: Konseling Gizi, Pemberian PMT, Rujukan Puskesmas, Kunjungan Rumah, atau Pengukuran Ulang.'
  });
}

followupsRouter.get(
  '/follow-ups',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  async (req, res, next) => {
    try {
      const user = req.user;
      const allowedPosyanduIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
      if (allowedPosyanduIds.length === 0) {
        return sendSuccess(res, []);
      }

      const statusFilter = req.query.status || 'all';
      const requestedOrgId = req.query.organization_id ? Number(req.query.organization_id) : null;
      if (requestedOrgId && !allowedPosyanduIds.includes(requestedOrgId)) {
        throw AppError.forbidden('Posyandu di luar cakupan wilayah Anda.');
      }

      const targetIds = requestedOrgId ? [requestedOrgId] : allowedPosyanduIds;

      let sql = `
        SELECT
          f.*,
          c.organization_id,
          c.internal_code,
          c.name AS child_name,
          c.birth_date,
          c.sex,
          g.name AS guardian_name,
          g.phone AS guardian_phone,
          o.name AS posyandu_name,
          o.code AS posyandu_code,
          au.name AS assigned_to_name,
          au.role AS assigned_to_role,
          cu.name AS created_by_name,
          clu.name AS closed_by_name,
          ga.z_score,
          ga.category,
          ga.review_status,
          (SELECT COUNT(*) FROM follow_up_updates fu WHERE fu.follow_up_id = f.id) AS update_count
        FROM follow_ups f
        INNER JOIN children c ON c.id = f.child_id
        LEFT JOIN guardians g ON g.id = c.guardian_id
        INNER JOIN organizations o ON o.id = c.organization_id
        INNER JOIN users au ON au.id = f.assigned_to
        INNER JOIN users cu ON cu.id = f.created_by
        LEFT JOIN users clu ON clu.id = f.closed_by
        LEFT JOIN growth_assessments ga ON ga.id = f.assessment_id
        WHERE c.organization_id IN (${targetIds.map(() => '?').join(',')})
      `;
      const params = [...targetIds];

      if (statusFilter && statusFilter !== 'all') {
        sql += ' AND f.status = ?';
        params.push(statusFilter);
      }

      sql += ` ORDER BY FIELD(f.status, 'open', 'in_progress', 'closed'), f.due_date ASC, f.id DESC`;

      const [rows] = await pool.query(sql, params);
      const todayStr = new Date().toISOString().slice(0, 10);

      return sendSuccess(
        res,
        rows.map((r) => {
          const dueDateStr = formatDateOnly(r.due_date);
          const isOverdue = r.status !== 'closed' && dueDateStr < todayStr;
          return {
            id: Number(r.id),
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
            assessment_id: r.assessment_id ? Number(r.assessment_id) : null,
            z_score: r.z_score !== null ? Number(r.z_score) : null,
            category: r.category || null,
            type: r.type,
            intervention_category: resolveInterventionCategory(r.type, r.description),
            description: r.description,
            assigned_to: Number(r.assigned_to),
            assigned_to_name: r.assigned_to_name,
            assigned_to_role: r.assigned_to_role,
            created_by: Number(r.created_by),
            created_by_name: r.created_by_name,
            due_date: dueDateStr,
            status: r.status,
            is_overdue: isOverdue,
            closed_by: r.closed_by ? Number(r.closed_by) : null,
            closed_by_name: r.closed_by_name || null,
            closed_at: r.closed_at,
            closure_note: r.closure_note || '',
            created_at: r.created_at,
            update_count: Number(r.update_count)
          };
        })
      );
    } catch (err) {
      next(err);
    }
  }
);

followupsRouter.get(
  '/follow-ups/:id',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  async (req, res, next) => {
    try {
      const followUpId = Number(req.params.id);
      if (!Number.isInteger(followUpId) || followUpId <= 0) {
        throw AppError.badRequest('ID tugas tindak lanjut tidak valid.');
      }

      const [rows] = await pool.query(
        `SELECT
          f.*,
          c.organization_id,
          c.internal_code,
          c.name AS child_name,
          c.birth_date,
          c.sex,
          g.name AS guardian_name,
          g.phone AS guardian_phone,
          o.name AS posyandu_name,
          o.code AS posyandu_code,
          au.name AS assigned_to_name,
          cu.name AS created_by_name,
          clu.name AS closed_by_name,
          ga.z_score,
          ga.category,
          ga.adjusted_length_height_cm
         FROM follow_ups f
         INNER JOIN children c ON c.id = f.child_id
         LEFT JOIN guardians g ON g.id = c.guardian_id
         INNER JOIN organizations o ON o.id = c.organization_id
         INNER JOIN users au ON au.id = f.assigned_to
         INNER JOIN users cu ON cu.id = f.created_by
         LEFT JOIN users clu ON clu.id = f.closed_by
         LEFT JOIN growth_assessments ga ON ga.id = f.assessment_id
         WHERE f.id = ?
         LIMIT 1`,
        [followUpId]
      );

      if (rows.length === 0) {
        throw AppError.notFound('Tugas tindak lanjut tidak ditemukan.');
      }

      const row = rows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, row.organization_id);

      const [updates] = await pool.query(
        `SELECT
          u.id,
          u.follow_up_id,
          u.actor_id,
          usr.name AS actor_name,
          usr.role AS actor_role,
          u.activity_at,
          u.note,
          u.result,
          u.created_at
         FROM follow_up_updates u
         INNER JOIN users usr ON usr.id = u.actor_id
         WHERE u.follow_up_id = ?
         ORDER BY u.created_at ASC, u.id ASC`,
        [followUpId]
      );

      const dueDateStr = formatDateOnly(row.due_date);
      const todayStr = new Date().toISOString().slice(0, 10);

      return sendSuccess(res, {
        followUp: {
          id: Number(row.id),
          child_id: Number(row.child_id),
          organization_id: Number(row.organization_id),
          posyandu_name: row.posyandu_name,
          posyandu_code: row.posyandu_code,
          internal_code: row.internal_code,
          child_name: row.child_name,
          birth_date: formatDateOnly(row.birth_date),
          sex: row.sex,
          guardian_name: row.guardian_name || '-',
          guardian_phone: row.guardian_phone || '',
          assessment_id: row.assessment_id ? Number(row.assessment_id) : null,
          z_score: row.z_score !== null ? Number(row.z_score) : null,
          category: row.category || null,
          adjusted_length_height_cm:
            row.adjusted_length_height_cm !== null ? Number(row.adjusted_length_height_cm) : null,
          type: row.type,
          intervention_category: resolveInterventionCategory(row.type, row.description),
          description: row.description,
          assigned_to: Number(row.assigned_to),
          assigned_to_name: row.assigned_to_name,
          created_by: Number(row.created_by),
          created_by_name: row.created_by_name,
          due_date: dueDateStr,
          status: row.status,
          is_overdue: row.status !== 'closed' && dueDateStr < todayStr,
          closed_by_name: row.closed_by_name || null,
          closed_at: row.closed_at,
          closure_note: row.closure_note || '',
          created_at: row.created_at
        },
        updates: updates.map((u) => ({
          ...u,
          id: Number(u.id),
          follow_up_id: Number(u.follow_up_id),
          actor_id: Number(u.actor_id)
        }))
      });
    } catch (err) {
      next(err);
    }
  }
);

const createFollowUpSchema = z.object({
  child_id: z.number().int().positive(),
  assessment_id: z.number().int().positive().nullable().optional(),
  type: z.string().trim().optional(),
  intervention_category: z.string().trim().optional(),
  description: z.string().trim().min(5, 'Deskripsi tugas minimal 5 karakter.').max(500),
  assigned_to: z.number().int().positive('Penanggung jawab wajib dipilih.').optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tenggat harus berformat YYYY-MM-DD.')
});

followupsRouter.post(
  '/follow-ups',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  async (req, res, next) => {
    try {
      const user = req.user;
      const payload = createFollowUpSchema.parse({
        ...req.body,
        child_id: Number(req.body?.child_id),
        assigned_to: req.body?.assigned_to ? Number(req.body.assigned_to) : user.id,
        assessment_id: req.body?.assessment_id ? Number(req.body.assessment_id) : null
      });

      const { dbType, categoryLabel } = normalizeFollowUpTypeInput(
        payload.type,
        payload.intervention_category
      );

      if (user.role === ROLES.KADER && dbType !== 'operational_measurement') {
        throw AppError.forbidden(
          'Kader Posyandu hanya dapat membuat tugas operasional kunjungan/pengukuran lapangan (operational_measurement).'
        );
      }

      const [childRows] = await pool.query(
        'SELECT id, internal_code, organization_id FROM children WHERE id = ? LIMIT 1',
        [payload.child_id]
      );
      if (childRows.length === 0) {
        throw AppError.notFound('Data anak tidak ditemukan.');
      }

      const child = childRows[0];
      await AccessPolicy.assertPosyanduAccess(user, child.organization_id);

      const storedDesc =
        payload.intervention_category && !payload.description.startsWith('[Kategori:')
          ? `[Kategori: ${categoryLabel}] ${payload.description}`
          : payload.description;

      const [result] = await pool.query(
        `INSERT INTO follow_ups
          (child_id, assessment_id, type, description, assigned_to, created_by, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
        [
          payload.child_id,
          payload.assessment_id,
          dbType,
          storedDesc,
          payload.assigned_to,
          user.id,
          payload.due_date
        ]
      );

      const newId = Number(result.insertId);
      await recordAuditLog({
        actorId: user.id,
        organizationId: Number(child.organization_id),
        action: 'FOLLOW_UP_CREATED',
        entityType: 'follow_up',
        entityId: newId,
        requestId: req.requestId,
        changeSummary: `Membuat tugas tindak lanjut (${categoryLabel}) untuk [${child.internal_code}] tenggat ${payload.due_date}.`
      });

      return sendSuccess(
        res,
        {
          id: newId,
          child_id: payload.child_id,
          type: dbType,
          intervention_category: categoryLabel,
          description: storedDesc,
          assigned_to: payload.assigned_to,
          due_date: payload.due_date,
          status: 'open'
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

const updateProgressSchema = z.object({
  result: z
    .enum(['contacted', 'visited', 'unreachable', 'referred', 'remeasured'])
    .optional()
    .default('visited'),
  note: z.string().trim().min(5, 'Catatan kegiatan minimal 5 karakter.').max(500),
  activity_at: z.string().optional()
});

followupsRouter.post(
  '/follow-ups/:id/updates',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  async (req, res, next) => {
    try {
      const followUpId = Number(req.params.id);
      if (!Number.isInteger(followUpId) || followUpId <= 0) {
        throw AppError.badRequest('ID tugas tindak lanjut tidak valid.');
      }

      const rawNote = req.body?.note ?? req.body?.progress_note ?? req.body?.notes ?? '';
      const payload = updateProgressSchema.parse({
        ...req.body,
        note: rawNote
      });

      const txResult = await withTransaction(async (conn) => {
        const [fRows] = await conn.query(
          `SELECT f.*, c.organization_id, c.internal_code
           FROM follow_ups f
           INNER JOIN children c ON c.id = f.child_id
           WHERE f.id = ?
           FOR UPDATE`,
          [followUpId]
        );

        if (fRows.length === 0) {
          throw AppError.notFound('Tugas tindak lanjut tidak ditemukan.');
        }

        const fu = fRows[0];
        await AccessPolicy.assertPosyanduAccess(req.user, fu.organization_id, conn);

        if (fu.status === 'closed') {
          throw AppError.conflict(
            'Tugas tindak lanjut sudah ditutup dan tidak dapat ditambah progres baru.'
          );
        }

        const activityAt =
          payload.activity_at || new Date().toISOString().slice(0, 19).replace('T', ' ');
        const [ins] = await conn.query(
          `INSERT INTO follow_up_updates (follow_up_id, actor_id, activity_at, note, result)
           VALUES (?, ?, ?, ?, ?)`,
          [followUpId, req.user.id, activityAt, payload.note, payload.result]
        );

        if (fu.status === 'open') {
          await conn.query("UPDATE follow_ups SET status = 'in_progress' WHERE id = ?", [
            followUpId
          ]);
        }

        await recordAuditLog(
          {
            actorId: req.user.id,
            organizationId: Number(fu.organization_id),
            action: 'FOLLOW_UP_UPDATED',
            entityType: 'follow_up',
            entityId: followUpId,
            requestId: req.requestId,
            changeSummary: `Mencatat progres tindak lanjut #${followUpId} [${fu.internal_code}]: ${payload.result}.`
          },
          conn
        );

        return {
          update_id: Number(ins.insertId),
          follow_up_id: followUpId,
          status: 'in_progress',
          result: payload.result,
          note: payload.note,
          actor_id: req.user.id,
          activity_at: activityAt
        };
      });

      return sendSuccess(res, txResult, 201);
    } catch (err) {
      next(err);
    }
  }
);

const closeSchema = z.object({
  closure_note: z
    .string()
    .trim()
    .min(5, 'Kesimpulan evaluasi penutupan wajib diisi minimal 5 karakter.')
    .max(500)
});

async function handleCloseFollowUp(req, res, next) {
  try {
    const followUpId = Number(req.params.id);
    if (!Number.isInteger(followUpId) || followUpId <= 0) {
      throw AppError.badRequest('ID tugas tindak lanjut tidak valid.');
    }

    const rawClosure =
      req.body?.closure_note ??
      req.body?.evaluation_summary ??
      req.body?.conclusion ??
      '';
    const { closure_note } = closeSchema.parse({ closure_note: rawClosure });

    const closed = await withTransaction(async (conn) => {
      const [fRows] = await conn.query(
        `SELECT f.*, c.organization_id, c.internal_code
         FROM follow_ups f
         INNER JOIN children c ON c.id = f.child_id
         WHERE f.id = ?
         FOR UPDATE`,
        [followUpId]
      );

      if (fRows.length === 0) {
        throw AppError.notFound('Tugas tindak lanjut tidak ditemukan.');
      }

      const fu = fRows[0];
      await AccessPolicy.assertPosyanduAccess(req.user, fu.organization_id, conn);

      if (fu.status === 'closed') {
        throw AppError.conflict('Tugas tindak lanjut ini sudah berstatus ditutup (closed).');
      }

      const closedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await conn.query(
        `UPDATE follow_ups
         SET status = 'closed',
             closed_by = ?,
             closed_at = ?,
             closure_note = ?
         WHERE id = ?`,
        [req.user.id, closedAt, closure_note, followUpId]
      );

      await recordAuditLog(
        {
          actorId: req.user.id,
          organizationId: Number(fu.organization_id),
          action: 'FOLLOW_UP_CLOSED',
          entityType: 'follow_up',
          entityId: followUpId,
          requestId: req.requestId,
          changeSummary: `Menutup tugas tindak lanjut #${followUpId} [${fu.internal_code}]: ${closure_note}`
        },
        conn
      );

      return {
        id: followUpId,
        status: 'closed',
        closed_by: req.user.id,
        closed_at: closedAt,
        closure_note
      };
    });

    return sendSuccess(res, closed);
  } catch (err) {
    next(err);
  }
}

followupsRouter.patch(
  '/follow-ups/:id/close',
  requireAuth,
  requireRoles(ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  handleCloseFollowUp
);

followupsRouter.post(
  '/follow-ups/:id/close',
  requireAuth,
  requireRoles(ROLES.PETUGAS_PUSKESMAS),
  verifyCsrf,
  handleCloseFollowUp
);

followupsRouter.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const user = req.user;
    if (user.role === ROLES.ADMINISTRATOR || user.role === ROLES.DINAS_KESEHATAN) {
      return sendSuccess(res, { count: 0, items: [] });
    }

    const allowedPosyanduIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
    if (allowedPosyanduIds.length === 0) {
      return sendSuccess(res, { count: 0, items: [] });
    }

    const placeholders = allowedPosyanduIds.map(() => '?').join(',');
    const items = [];

    if (user.role === ROLES.PETUGAS_PUSKESMAS) {
      const [pendingReviews] = await pool.query(
        `SELECT
          ga.id,
          c.name AS child_name,
          c.internal_code,
          ga.z_score,
          ga.category,
          o.name AS posyandu_name,
          m.measured_at
         FROM growth_assessments ga
         INNER JOIN measurements m ON m.id = ga.measurement_id
         INNER JOIN attendances a ON a.id = m.attendance_id
         INNER JOIN children c ON c.id = a.child_id
         INNER JOIN organizations o ON o.id = c.organization_id
         WHERE m.status = 'submitted'
           AND ga.review_status = 'pending'
           AND c.organization_id IN (${placeholders})
         ORDER BY m.measured_at DESC
         LIMIT 6`,
        allowedPosyanduIds
      );

      for (const r of pendingReviews) {
        items.push({
          id: `rev-${r.id}`,
          type: 'review_pending',
          severity: 'warning',
          title: `Menunggu Peninjauan: ${r.child_name}`,
          message: `${r.posyandu_name} (${r.internal_code}) Z-Score ${r.z_score} (${r.category.replace('_', ' ')}).`,
          link: '/peninjauan',
          occurred_at: r.measured_at
        });
      }

      const [overdueTasks] = await pool.query(
        `SELECT
          f.id,
          f.due_date,
          c.name AS child_name,
          o.name AS posyandu_name
         FROM follow_ups f
         INNER JOIN children c ON c.id = f.child_id
         INNER JOIN organizations o ON o.id = c.organization_id
         WHERE f.status IN ('open', 'in_progress')
           AND f.due_date < CURDATE()
           AND c.organization_id IN (${placeholders})
         ORDER BY f.due_date ASC
         LIMIT 5`,
        allowedPosyanduIds
      );

      for (const t of overdueTasks) {
        items.push({
          id: `overdue-${t.id}`,
          type: 'followup_overdue',
          severity: 'danger',
          title: `Tindak Lanjut Melewati Tenggat: ${t.child_name}`,
          message: `Tugas #${t.id} di ${t.posyandu_name} melewati tenggat ${formatDateOnly(t.due_date)}.`,
          link: `/tindak-lanjut/${t.id}`,
          occurred_at: t.due_date
        });
      }
    } else if (user.role === ROLES.KADER) {
      const [remeasureReqs] = await pool.query(
        `SELECT
          ga.id,
          ga.review_note,
          ga.reviewed_at,
          c.id AS child_id,
          c.name AS child_name,
          c.internal_code
         FROM growth_assessments ga
         INNER JOIN measurements m ON m.id = ga.measurement_id
         INNER JOIN attendances a ON a.id = m.attendance_id
         INNER JOIN children c ON c.id = a.child_id
         WHERE m.status = 'submitted'
           AND ga.review_status = 'remeasure_requested'
           AND c.organization_id IN (${placeholders})
         ORDER BY ga.reviewed_at DESC
         LIMIT 5`,
        allowedPosyanduIds
      );

      for (const rm of remeasureReqs) {
        items.push({
          id: `rem-${rm.id}`,
          type: 'remeasure_requested',
          severity: 'danger',
          title: `Permintaan Ukur Ulang: ${rm.child_name}`,
          message: rm.review_note || `Petugas Puskesmas meminta pengukuran ulang untuk ${rm.internal_code}.`,
          link: `/anak/${rm.child_id}`,
          occurred_at: rm.reviewed_at
        });
      }

      const [assignedTasks] = await pool.query(
        `SELECT
          f.id,
          f.type,
          f.due_date,
          f.status,
          f.created_at,
          c.name AS child_name
         FROM follow_ups f
         INNER JOIN children c ON c.id = f.child_id
         WHERE f.status IN ('open', 'in_progress')
           AND c.organization_id IN (${placeholders})
         ORDER BY f.due_date ASC
         LIMIT 6`,
        allowedPosyanduIds
      );

      for (const t of assignedTasks) {
        items.push({
          id: `task-${t.id}`,
          type: 'followup_assigned',
          severity: 'info',
          title: `Tugas Tindak Lanjut: ${t.child_name}`,
          message: `Status ${t.status === 'open' ? 'Baru' : 'Sedang berjalan'} (Tenggat: ${formatDateOnly(t.due_date)}).`,
          link: `/tindak-lanjut/${t.id}`,
          occurred_at: t.created_at
        });
      }
    }

    return sendSuccess(res, {
      count: items.length,
      items
    });
  } catch (err) {
    next(err);
  }
});
