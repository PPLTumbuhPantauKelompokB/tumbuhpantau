import { Router } from 'express';
import { pool } from '../../config/db.js';
import { AppError } from '../../lib/AppError.js';
import { sendSuccess } from '../../lib/respond.js';
import { requireAuth, requireRoles } from '../../middlewares/auth.js';
import { AccessPolicy, ROLES } from '../../policies/AccessPolicy.js';
import { recordAuditLog } from '../../services/auditService.js';
import { CLINICAL_DISCLAIMER } from '../../services/growthCalculator.js';

export const reportsRouter = Router();

function maskSmallCell(value, shouldMask) {
  const num = Number(value || 0);
  if (shouldMask && num >= 1 && num <= 4) {
    return '<5';
  }
  return num;
}

async function buildAggregateData(user, requestedPeriod, requestedPosyanduId = null) {
  const allowedPosyanduIds = await AccessPolicy.resolveAllowedPosyanduIds(user);
  if (allowedPosyanduIds.length === 0) {
    return {
      period: requestedPeriod || '2026-11',
      rawUnits: [],
      maskedUnits: [],
      stuntingTrend: [],
      totals: {
        total_anak_terdaftar: 0,
        total_anak_aktif: 0,
        jumlah_diukur_lengkap: 0,
        jumlah_belum_diukur: 0,
        jumlah_pengukuran_draf: 0,
        kategori_sangat_pendek: 0,
        kategori_pendek: 0,
        kategori_normal: 0,
        kategori_tinggi: 0,
        perlu_peninjauan: 0,
        ukur_ulang: 0,
        tervalidasi: 0,
        tindak_lanjut_aktif: 0,
        tindak_lanjut_selesai: 0
      }
    };
  }

  let targetOrgIds = allowedPosyanduIds;
  if (requestedPosyanduId) {
    const parsedId = Number(requestedPosyanduId);
    if (!allowedPosyanduIds.includes(parsedId)) {
      throw AppError.forbidden('Posyandu yang dipilih berada di luar cakupan wilayah Anda.');
    }
    targetOrgIds = [parsedId];
  }

  const placeholders = targetOrgIds.map(() => '?').join(',');

  let period = requestedPeriod && /^\d{4}-\d{2}$/.test(requestedPeriod) ? requestedPeriod : null;
  if (!period) {
    const [latest] = await pool.query(
      `SELECT DATE_FORMAT(MAX(session_date), '%Y-%m') AS latest_period
       FROM posyandu_sessions
       WHERE organization_id IN (${placeholders})`,
      targetOrgIds
    );
    period = latest[0]?.latest_period || new Date().toISOString().slice(0, 7);
  }

  const [orgs] = await pool.query(
    `SELECT
      o.id,
      o.code,
      o.name,
      o.type,
      p.id AS puskesmas_id,
      p.code AS puskesmas_code,
      p.name AS puskesmas_name
     FROM organizations o
     LEFT JOIN organizations p ON p.id = o.parent_id
     WHERE o.id IN (${placeholders})
     ORDER BY o.code ASC`,
    targetOrgIds
  );

  const rawUnits = [];
  const totals = {
    total_anak_terdaftar: 0,
    total_anak_aktif: 0,
    jumlah_diukur_lengkap: 0,
    jumlah_belum_diukur: 0,
    jumlah_pengukuran_draf: 0,
    kategori_sangat_pendek: 0,
    kategori_pendek: 0,
    kategori_normal: 0,
    kategori_tinggi: 0,
    perlu_peninjauan: 0,
    ukur_ulang: 0,
    tervalidasi: 0,
    tindak_lanjut_aktif: 0,
    tindak_lanjut_selesai: 0
  };

  for (const org of orgs) {
    const orgId = Number(org.id);

    const [childCounts] = await pool.query(
      `SELECT
        COUNT(*) AS total_cnt,
        SUM(CASE WHEN inactive_on IS NULL THEN 1 ELSE 0 END) AS active_cnt
       FROM children
       WHERE organization_id = ?`,
      [orgId]
    );
    const totalRegistered = Number(childCounts[0]?.total_cnt || 0);
    const totalActive = Number(childCounts[0]?.active_cnt || 0);

    const [submittedRows] = await pool.query(
      `SELECT
        a.child_id,
        ga.category,
        ga.review_status
       FROM measurements m
       INNER JOIN attendances a ON a.id = m.attendance_id
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       INNER JOIN growth_assessments ga ON ga.measurement_id = m.id
       WHERE s.organization_id = ?
         AND DATE_FORMAT(s.session_date, '%Y-%m') = ?
         AND m.status = 'submitted'`,
      [orgId, period]
    );

    const measuredChildSet = new Set();
    let catSangatPendek = 0;
    let catPendek = 0;
    let catNormal = 0;
    let catTinggi = 0;
    let perluPeninjauan = 0;
    let ukurUlang = 0;
    let tervalidasi = 0;

    for (const r of submittedRows) {
      const cid = Number(r.child_id);
      if (measuredChildSet.has(cid)) continue;
      measuredChildSet.add(cid);

      if (r.category === 'sangat_pendek') catSangatPendek++;
      else if (r.category === 'pendek') catPendek++;
      else if (r.category === 'normal') catNormal++;
      else if (r.category === 'tinggi') catTinggi++;

      if (r.review_status === 'pending') perluPeninjauan++;
      else if (r.review_status === 'remeasure_requested') ukurUlang++;
      else if (r.review_status === 'validated') tervalidasi++;
    }

    const [draftRows] = await pool.query(
      `SELECT DISTINCT a.child_id
       FROM attendances a
       INNER JOIN posyandu_sessions s ON s.id = a.session_id
       LEFT JOIN measurements m ON m.attendance_id = a.id AND m.status IN ('submitted', 'draft')
       WHERE s.organization_id = ?
         AND DATE_FORMAT(s.session_date, '%Y-%m') = ?
         AND a.status = 'present'
         AND (m.id IS NULL OR m.status = 'draft')`,
      [orgId, period]
    );

    let draftCount = 0;
    for (const d of draftRows) {
      if (!measuredChildSet.has(Number(d.child_id))) {
        draftCount++;
      }
    }

    const completeCount = measuredChildSet.size;
    const unmeasuredCount = Math.max(0, totalActive - completeCount - draftCount);

    const [fuRows] = await pool.query(
      `SELECT
        SUM(CASE WHEN f.status IN ('open', 'in_progress') THEN 1 ELSE 0 END) AS active_cnt,
        SUM(CASE WHEN f.status = 'closed' THEN 1 ELSE 0 END) AS closed_cnt
       FROM follow_ups f
       INNER JOIN children c ON c.id = f.child_id
       WHERE c.organization_id = ?`,
      [orgId]
    );

    const fuActive = Number(fuRows[0]?.active_cnt || 0);
    const fuClosed = Number(fuRows[0]?.closed_cnt || 0);

    const unitItem = {
      periode: period,
      organization_id: orgId,
      kode_organisasi: org.code,
      nama_organisasi: org.name,
      tipe_organisasi: org.type,
      puskesmas_name: org.puskesmas_name || '-',
      total_anak_terdaftar: totalRegistered,
      total_anak_aktif: totalActive,
      jumlah_diukur_lengkap: completeCount,
      jumlah_belum_diukur: unmeasuredCount,
      jumlah_pengukuran_draf: draftCount,
      kategori_sangat_pendek: catSangatPendek,
      kategori_pendek: catPendek,
      kategori_normal: catNormal,
      kategori_tinggi: catTinggi,
      perlu_peninjauan: perluPeninjauan,
      ukur_ulang: ukurUlang,
      tervalidasi,
      tindak_lanjut_aktif: fuActive,
      tindak_lanjut_selesai: fuClosed
    };

    rawUnits.push(unitItem);

    totals.total_anak_terdaftar += totalRegistered;
    totals.total_anak_aktif += totalActive;
    totals.jumlah_diukur_lengkap += completeCount;
    totals.jumlah_belum_diukur += unmeasuredCount;
    totals.jumlah_pengukuran_draf += draftCount;
    totals.kategori_sangat_pendek += catSangatPendek;
    totals.kategori_pendek += catPendek;
    totals.kategori_normal += catNormal;
    totals.kategori_tinggi += catTinggi;
    totals.perlu_peninjauan += perluPeninjauan;
    totals.ukur_ulang += ukurUlang;
    totals.tervalidasi += tervalidasi;
    totals.tindak_lanjut_aktif += fuActive;
    totals.tindak_lanjut_selesai += fuClosed;
  }

  const [trendRows] = await pool.query(
    `SELECT
      DATE_FORMAT(s.session_date, '%Y-%m') AS period,
      COUNT(DISTINCT a.child_id) AS measured_count,
      COUNT(DISTINCT CASE WHEN ga.category IN ('sangat_pendek', 'pendek') THEN a.child_id END) AS stunted_count
     FROM posyandu_sessions s
     INNER JOIN attendances a ON a.session_id = s.id
     INNER JOIN measurements m ON m.attendance_id = a.id AND m.status = 'submitted'
     INNER JOIN growth_assessments ga ON ga.measurement_id = m.id
     WHERE s.organization_id IN (${placeholders})
     GROUP BY DATE_FORMAT(s.session_date, '%Y-%m')
     ORDER BY period ASC
     LIMIT 6`,
    targetOrgIds
  );

  const stuntingTrend = trendRows.map((tr) => {
    const measured = Number(tr.measured_count || 0);
    const stunted = Number(tr.stunted_count || 0);
    return {
      period: tr.period,
      measured_count: measured,
      stunted_count: stunted,
      prevalence_percent: measured > 0 ? Number(((stunted / measured) * 100).toFixed(1)) : 0
    };
  });

  const isDinas = user.role === ROLES.DINAS_KESEHATAN;
  const maskedUnits = rawUnits.map((u) => {
    const sp = maskSmallCell(u.kategori_sangat_pendek, isDinas);
    const p = maskSmallCell(u.kategori_pendek, isDinas);
    const n = maskSmallCell(u.kategori_normal, isDinas);
    const t = maskSmallCell(u.kategori_tinggi, isDinas);
    const rev = maskSmallCell(u.perlu_peninjauan, isDinas);
    const isRowMasked = isDinas && [sp, p, n, t, rev].some((val) => val === '<5');

    return {
      periode: u.periode,
      kode_organisasi: u.kode_organisasi,
      nama_organisasi: u.nama_organisasi,
      tipe_organisasi: u.tipe_organisasi,
      puskesmas_name: u.puskesmas_name,
      total_anak_aktif: u.total_anak_aktif,
      jumlah_diukur_lengkap: u.jumlah_diukur_lengkap,
      jumlah_belum_diukur: u.jumlah_belum_diukur,
      jumlah_pengukuran_draf: u.jumlah_pengukuran_draf,
      kategori_sangat_pendek: sp,
      kategori_pendek: p,
      kategori_normal: n,
      kategori_tinggi: t,
      perlu_peninjauan: rev,
      tindak_lanjut_aktif: u.tindak_lanjut_aktif,
      tindak_lanjut_selesai: u.tindak_lanjut_selesai,
      disamarkan: isRowMasked ? 'Ya' : 'Tidak'
    };
  });

  return { period, rawUnits, maskedUnits, stuntingTrend, totals };
}

async function handleGetDashboardStats(req, res, next) {
  try {
    const user = req.user;
    const requestedPeriod = req.query.period ? String(req.query.period).slice(0, 7) : null;
    const requestedPosyanduId = req.query.organization_id || req.query.posyanduId || null;

    const { period, rawUnits, maskedUnits, stuntingTrend, totals } = await buildAggregateData(
      user,
      requestedPeriod,
      requestedPosyanduId
    );

    const [periodsRows] = await pool.query(
      `SELECT DISTINCT DATE_FORMAT(session_date, '%Y-%m') AS period
       FROM posyandu_sessions
       ORDER BY period DESC
       LIMIT 12`
    );
    const availablePeriods = periodsRows.map((r) => r.period);
    if (!availablePeriods.includes(period)) {
      availablePeriods.unshift(period);
    }

    const stuntedRiskCount = totals.kategori_sangat_pendek + totals.kategori_pendek;
    const activeChildrenPercent =
      totals.total_anak_terdaftar > 0
        ? Number(((totals.total_anak_aktif / totals.total_anak_terdaftar) * 100).toFixed(1))
        : 100;
    const coveragePercent =
      totals.total_anak_aktif > 0
        ? Number(((totals.jumlah_diukur_lengkap / totals.total_anak_aktif) * 100).toFixed(1))
        : 0;
    const stuntingPrevalencePercent =
      totals.jumlah_diukur_lengkap > 0
        ? Number(((stuntedRiskCount / totals.jumlah_diukur_lengkap) * 100).toFixed(1))
        : 0;

    return sendSuccess(res, {
      period,
      availablePeriods,
      scopeRole: user.role,
      organizationName: user.organization_name,
      kpis: {
        total_registered_children: totals.total_anak_terdaftar,
        total_active_children: totals.total_anak_aktif,
        active_children_percent: activeChildrenPercent,
        measured_complete_count: totals.jumlah_diukur_lengkap,
        coverage_percent: coveragePercent,
        stunted_risk_count: stuntedRiskCount,
        stunting_prevalence_percent: stuntingPrevalencePercent,
        pending_reviews_count: totals.perlu_peninjauan,
        active_followups_count: totals.tindak_lanjut_aktif,
        closed_followups_count: totals.tindak_lanjut_selesai
      },
      chart1CategoryDistribution: {
        chartType: user.role === ROLES.KADER ? 'doughnut' : 'stackedBar',
        totals: {
          sangat_pendek: totals.kategori_sangat_pendek,
          pendek: totals.kategori_pendek,
          normal: totals.kategori_normal,
          tinggi: totals.kategori_tinggi
        },
        byUnit: rawUnits.map((u) => ({
          code: u.kode_organisasi,
          name: u.nama_organisasi,
          sangat_pendek: u.kategori_sangat_pendek,
          pendek: u.kategori_pendek,
          normal: u.kategori_normal,
          tinggi: u.kategori_tinggi
        }))
      },
      chart2Completeness: {
        totals: {
          diukur_lengkap: totals.jumlah_diukur_lengkap,
          hadir_belum_lengkap: totals.jumlah_pengukuran_draf,
          belum_diukur: totals.jumlah_belum_diukur
        },
        byUnit: rawUnits.map((u) => ({
          code: u.kode_organisasi,
          name: u.nama_organisasi,
          diukur_lengkap: u.jumlah_diukur_lengkap,
          hadir_belum_lengkap: u.jumlah_pengukuran_draf,
          belum_diukur: u.jumlah_belum_diukur
        }))
      },
      chart3ReviewAndFollowup: {
        totals: {
          perlu_peninjauan: totals.perlu_peninjauan,
          ukur_ulang: totals.ukur_ulang,
          tervalidasi: totals.tervalidasi,
          tindak_lanjut_aktif: totals.tindak_lanjut_aktif,
          tindak_lanjut_selesai: totals.tindak_lanjut_selesai
        },
        byUnit: rawUnits.map((u) => ({
          code: u.kode_organisasi,
          name: u.nama_organisasi,
          perlu_peninjauan: u.perlu_peninjauan,
          ukur_ulang: u.ukur_ulang,
          tervalidasi: u.tervalidasi,
          tindak_lanjut_aktif: u.tindak_lanjut_aktif,
          tindak_lanjut_selesai: u.tindak_lanjut_selesai
        }))
      },
      stuntingTrend,
      unitRows: maskedUnits,
      disclaimer: CLINICAL_DISCLAIMER
    });
  } catch (err) {
    next(err);
  }
}

reportsRouter.get(
  '/dashboard/stats',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS, ROLES.DINAS_KESEHATAN),
  handleGetDashboardStats
);

reportsRouter.get(
  '/dashboard/summary',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS, ROLES.DINAS_KESEHATAN),
  handleGetDashboardStats
);

reportsRouter.get(
  '/reports/aggregate',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS, ROLES.DINAS_KESEHATAN),
  async (req, res, next) => {
    try {
      const requestedPeriod = req.query.period ? String(req.query.period).slice(0, 7) : null;
      const requestedPosyanduId = req.query.posyanduId || req.query.organization_id || null;
      const { period, maskedUnits, totals } = await buildAggregateData(
        req.user,
        requestedPeriod,
        requestedPosyanduId
      );

      return sendSuccess(res, {
        period,
        isMaskedForDinas: req.user.role === ROLES.DINAS_KESEHATAN,
        columns: [
          'periode',
          'kode_organisasi',
          'nama_organisasi',
          'tipe_organisasi',
          'total_anak_aktif',
          'jumlah_diukur_lengkap',
          'jumlah_belum_diukur',
          'jumlah_pengukuran_draf',
          'kategori_sangat_pendek',
          'kategori_pendek',
          'kategori_normal',
          'kategori_tinggi',
          'perlu_peninjauan',
          'tindak_lanjut_aktif',
          'tindak_lanjut_selesai',
          'disamarkan'
        ],
        rows: maskedUnits,
        totals,
        disclaimer: CLINICAL_DISCLAIMER
      });
    } catch (err) {
      next(err);
    }
  }
);

function escapeCsvCell(val) {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function handleExportAggregateCsv(req, res, next) {
  try {
    const requestedPeriod = req.query.period ? String(req.query.period).slice(0, 7) : null;
    const requestedPosyanduId = req.query.posyanduId || req.query.organization_id || null;
    const { period, maskedUnits } = await buildAggregateData(
      req.user,
      requestedPeriod,
      requestedPosyanduId
    );

    const headers = [
      'periode',
      'kode_organisasi',
      'nama_organisasi',
      'tipe_organisasi',
      'total_anak_aktif',
      'jumlah_diukur_lengkap',
      'jumlah_belum_diukur',
      'jumlah_pengukuran_draf',
      'kategori_sangat_pendek',
      'kategori_pendek',
      'kategori_normal',
      'kategori_tinggi',
      'perlu_peninjauan',
      'tindak_lanjut_aktif',
      'tindak_lanjut_selesai',
      'disamarkan'
    ];

    const lines = [headers.join(',')];
    for (const row of maskedUnits) {
      lines.push(headers.map((h) => escapeCsvCell(row[h])).join(','));
    }

    const csvContent = `\uFEFF${lines.join('\r\n')}\r\n`;

    await recordAuditLog({
      actorId: req.user.id,
      organizationId: req.user.organization_id,
      action: 'REPORT_CSV_EXPORTED',
      entityType: 'report',
      entityId: requestedPosyanduId ? Number(requestedPosyanduId) : null,
      requestId: req.requestId,
      changeSummary: `Mengunduh laporan CSV agregat periode ${period} (${maskedUnits.length} unit, disamarkan=${
        req.user.role === ROLES.DINAS_KESEHATAN
      }).`
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tumbuhpantau-agregat-${period}.csv"`
    );
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

reportsRouter.get(
  '/reports/export-csv',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS, ROLES.DINAS_KESEHATAN),
  handleExportAggregateCsv
);

reportsRouter.get(
  '/reports/aggregate/export',
  requireAuth,
  requireRoles(ROLES.KADER, ROLES.PETUGAS_PUSKESMAS, ROLES.DINAS_KESEHATAN),
  handleExportAggregateCsv
);
