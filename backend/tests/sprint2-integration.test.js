import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { closePool, pool } from '../src/config/db.js';
import { seedDatabase } from '../scripts/seed.js';

let server;
let baseUrl;

function createSessionClient(base) {
  let cookieHeader = '';
  let csrfToken = '';

  return {
    async request(path, { method = 'GET', body = undefined, headers = {} } = {}) {
      const reqHeaders = { ...headers };
      if (cookieHeader) {
        reqHeaders.cookie = cookieHeader;
      }
      if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        reqHeaders['x-csrf-token'] = csrfToken;
      }
      if (body !== undefined) {
        reqHeaders['content-type'] = 'application/json';
      }

      const res = await fetch(`${base}${path}`, {
        method,
        headers: reqHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });

      const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      if (setCookie.length > 0) {
        cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
      }
      const headerCsrf = res.headers.get('x-csrf-token');
      if (headerCsrf) {
        csrfToken = headerCsrf;
      }

      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await res.json()
        : await res.text();

      if (payload?.data?.csrfToken) {
        csrfToken = payload.data.csrfToken;
      }

      return { status: res.status, headers: res.headers, body: payload };
    }
  };
}

test.before(async () => {
  await seedDatabase();
  const app = createApp({ useMemorySession: true });
  server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await seedDatabase();
  await closePool();
});

test('TEST-02 (SCRUM-36): isolasi keamanan RBAC, pembatasan lintas organisasi (401/403), dan pencatatan audit_logs', async () => {
  const anonClient = createSessionClient(baseUrl);
  const protectedEndpoints = [
    '/api/v1/children',
    '/api/v1/sessions',
    '/api/v1/reviews/queue',
    '/api/v1/follow-ups',
    '/api/v1/dashboard/stats',
    '/api/v1/reports/export-csv',
    '/api/v1/audit-logs'
  ];

  for (const ep of protectedEndpoints) {
    const res = await anonClient.request(ep);
    assert.equal(res.status, 401, `Permintaan tanpa login ke ${ep} harus ditolak 401`);
  }

  const kaderMlt01 = createSessionClient(baseUrl);
  const loginKader = await kaderMlt01.request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'kader.mlt01', password: '123456' }
  });
  assert.equal(loginKader.status, 200);
  const kaderUserId = loginKader.body.data.user.id;

  const [posKngRows] = await pool.query(
    `SELECT c.id AS child_id, s.id AS session_id, m.id AS measurement_id, ga.id AS assessment_id
     FROM children c
     JOIN organizations o ON o.id = c.organization_id
     JOIN posyandu_sessions s ON s.organization_id = o.id
     JOIN attendances sa ON sa.session_id = s.id AND sa.child_id = c.id
     JOIN measurements m ON m.attendance_id = sa.id AND m.status = 'submitted'
     JOIN growth_assessments ga ON ga.measurement_id = m.id
     WHERE o.code = 'POS-KNG-01'
     LIMIT 1`
  );
  assert.ok(posKngRows.length > 0, 'Data benih POS-KNG-01 harus tersedia');
  const kngTarget = posKngRows[0];

  const crossChildGet = await kaderMlt01.request(`/api/v1/children/${kngTarget.child_id}`);
  assert.equal(crossChildGet.status, 403, 'Kader POS-MLT-01 dilarang membaca profil balita POS-KNG-01');

  const crossChildPatch = await kaderMlt01.request(`/api/v1/children/${kngTarget.child_id}`, {
    method: 'PATCH',
    body: { name: 'Percobaan Ubah Lintas Posyandu' }
  });
  assert.equal(crossChildPatch.status, 403, 'Kader POS-MLT-01 dilarang mengubah balita POS-KNG-01');

  const crossSessionGet = await kaderMlt01.request(`/api/v1/sessions/${kngTarget.session_id}`);
  assert.equal(crossSessionGet.status, 403, 'Kader POS-MLT-01 dilarang membuka sesi POS-KNG-01');

  const crossMeasurementGet = await kaderMlt01.request(
    `/api/v1/measurements/${kngTarget.measurement_id}`
  );
  assert.equal(
    crossMeasurementGet.status,
    403,
    'Kader POS-MLT-01 dilarang membaca detail pengukuran POS-KNG-01'
  );

  const kaderReviewQueue = await kaderMlt01.request('/api/v1/reviews/queue');
  assert.equal(kaderReviewQueue.status, 403, 'Kader dilarang mengakses antrean review Puskesmas');

  const kaderReviewDecision = await kaderMlt01.request(
    `/api/v1/growth-assessments/${kngTarget.assessment_id}/review`,
    {
      method: 'PATCH',
      body: { review_status: 'confirmed', review_notes: 'Percobaan review oleh kader' }
    }
  );
  assert.equal(kaderReviewDecision.status, 403, 'Kader dilarang mencatat keputusan review');

  const kaderAuditLogs = await kaderMlt01.request('/api/v1/audit-logs');
  assert.equal(kaderAuditLogs.status, 403, 'Kader dilarang mengakses log audit');

  const petugasMelati = createSessionClient(baseUrl);
  await petugasMelati.request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'petugas.melati', password: '123456' }
  });

  const crossPuskesmasChild = await petugasMelati.request(`/api/v1/children/${kngTarget.child_id}`);
  assert.equal(
    crossPuskesmasChild.status,
    403,
    'Petugas Puskesmas Melati dilarang mengakses balita Puskesmas Kenanga'
  );

  const crossPuskesmasReview = await petugasMelati.request(
    `/api/v1/growth-assessments/${kngTarget.assessment_id}/review`,
    {
      method: 'PATCH',
      body: { review_status: 'confirmed', review_notes: 'Percobaan lintas Puskesmas' }
    }
  );
  assert.equal(
    crossPuskesmasReview.status,
    403,
    'Petugas Puskesmas Melati dilarang meninjau hasil pengukuran Puskesmas Kenanga'
  );

  const [deniedAuditRows] = await pool.query(
    `SELECT id, actor_id, action, entity_type
     FROM audit_logs
     WHERE action = 'ACCESS_DENIED' AND actor_id = ?
     ORDER BY id DESC
     LIMIT 5`,
    [kaderUserId]
  );
  assert.ok(
    deniedAuditRows.length > 0,
    'Pelanggaran otorisasi 403 wajib tercatat di tabel audit_logs dengan action ACCESS_DENIED'
  );
});

test('Fase 1 (SCRUM-47, SCRUM-48, SCRUM-45): aktivasi kembali balita, ubah kehadiran sesi open, dan filter audit log', async () => {
  const kaderClient = createSessionClient(baseUrl);
  await kaderClient.request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'kader.mlt01', password: '123456' }
  });

  const childrenRes = await kaderClient.request('/api/v1/children');
  assert.equal(childrenRes.status, 200);
  const targetChild = childrenRes.body.data[0];

  const deactRes = await kaderClient.request(`/api/v1/children/${targetChild.id}/deactivate`, {
    method: 'PATCH',
    body: { reason: 'Pindah domisili sementara' }
  });
  assert.equal(deactRes.status, 200);
  assert.ok(deactRes.body.data.inactive_on);

  const actRes = await kaderClient.request(`/api/v1/children/${targetChild.id}/activate`, {
    method: 'PATCH'
  });
  assert.equal(actRes.status, 200);
  assert.equal(actRes.body.data.inactive_on, null);

  const actAgainRes = await kaderClient.request(`/api/v1/children/${targetChild.id}/activate`, {
    method: 'PATCH'
  });
  assert.equal(actAgainRes.status, 400);
  assert.equal(actAgainRes.body.error.code, 'BAD_REQUEST');

  const sessionsRes = await kaderClient.request('/api/v1/sessions');
  const openSession = sessionsRes.body.data.find((s) => s.status === 'open');
  const closedSession = sessionsRes.body.data.find((s) => s.status === 'closed');
  assert.ok(openSession && closedSession);

  const openDetail = await kaderClient.request(`/api/v1/sessions/${openSession.id}`);
  const targetAtt = openDetail.body.data.children.find((r) => r.attendance_id);
  assert.ok(targetAtt);

  const newStatus = targetAtt.attendance_status === 'present' ? 'absent' : 'present';
  const patchAttRes = await kaderClient.request(
    `/api/v1/sessions/${openSession.id}/attendances/${targetAtt.attendance_id}`,
    {
      method: 'PATCH',
      body: { status: newStatus, note: 'Koreksi kehadiran oleh kader' }
    }
  );
  assert.equal(patchAttRes.status, 200);
  assert.equal(patchAttRes.body.data.status, newStatus);

  await kaderClient.request(
    `/api/v1/sessions/${openSession.id}/attendances/${targetAtt.attendance_id}`,
    {
      method: 'PATCH',
      body: { status: targetAtt.attendance_status }
    }
  );

  const closedDetail = await kaderClient.request(`/api/v1/sessions/${closedSession.id}`);
  const closedAtt = closedDetail.body.data.children.find((r) => r.attendance_id);
  const patchClosedRes = await kaderClient.request(
    `/api/v1/sessions/${closedSession.id}/attendances/${closedAtt.attendance_id}`,
    {
      method: 'PATCH',
      body: { status: 'absent' }
    }
  );
  assert.equal(patchClosedRes.status, 400);
  assert.equal(patchClosedRes.body.error.code, 'BAD_REQUEST');

  const petugasClient = createSessionClient(baseUrl);
  await petugasClient.request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'petugas.melati', password: '123456' }
  });

  const auditRes = await petugasClient.request(
    '/api/v1/audit-logs?action=CHILD_ACTIVATED&entityType=child&limit=20'
  );
  assert.equal(auditRes.status, 200);
  const auditItems = Array.isArray(auditRes.body.data)
    ? auditRes.body.data
    : auditRes.body.data.items;
  assert.ok(auditItems.some((log) => log.action === 'CHILD_ACTIVATED'));
});

test('Fase 2 (SCRUM-24, 27, 46, 26, 25): draf, hapus draf, kirim atomik + idempotensi, detail & revisi pengukuran, kurva WHO', async () => {
  const kaderClient = createSessionClient(baseUrl);
  await kaderClient.request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'kader.mlt01', password: '123456' }
  });

  const childRes = await kaderClient.request('/api/v1/children', {
    method: 'POST',
    body: {
      name: 'Raka Putra Pratama',
      birth_date: '2025-05-10',
      sex: 'L',
      guardian_name: 'Ibu Rina Wati',
      guardian_phone: '081277776666',
      guardian_relationship: 'Ibu'
    }
  });
  assert.equal(childRes.status, 201);
  const childId = childRes.body.data.id;

  const sessionsRes = await kaderClient.request('/api/v1/sessions');
  const openSession = sessionsRes.body.data.find((s) => s.status === 'open');

  const attRes = await kaderClient.request(`/api/v1/sessions/${openSession.id}/attendances`, {
    method: 'POST',
    body: { items: [{ child_id: childId, status: 'present' }] }
  });
  assert.equal(attRes.status, 200);
  const attendanceId = attRes.body.data.attendances[0].id;

  const draftRes = await kaderClient.request(
    `/api/v1/attendances/${attendanceId}/measurements/drafts`,
    {
      method: 'POST',
      body: { weight_kg: 9.1, position: 'recumbent', note: 'Draf sementara' }
    }
  );
  assert.equal(draftRes.status, 200);
  assert.equal(draftRes.body.data.status, 'draft');
  const draftId = draftRes.body.data.id;

  const delDraftRes = await kaderClient.request(`/api/v1/measurements/drafts/${draftId}`, {
    method: 'DELETE'
  });
  assert.equal(delDraftRes.status, 200);
  assert.equal(delDraftRes.body.data.deleted_id, draftId);

  const reqToken = 'tok-sprint2-raka-001';
  const submitRes = await kaderClient.request(
    `/api/v1/attendances/${attendanceId}/measurements/submit`,
    {
      method: 'POST',
      body: {
        weight_kg: 9.3,
        length_height_cm: 75.2,
        position: 'recumbent',
        request_token: reqToken
      }
    }
  );
  assert.equal(submitRes.status, 201);
  assert.equal(submitRes.body.data.measurement.status, 'submitted');
  const submittedId = submitRes.body.data.measurement.id;

  const replayRes = await kaderClient.request(
    `/api/v1/attendances/${attendanceId}/measurements/submit`,
    {
      method: 'POST',
      body: {
        weight_kg: 9.3,
        length_height_cm: 75.2,
        position: 'recumbent',
        request_token: reqToken
      }
    }
  );
  assert.equal(replayRes.status, 200);
  assert.equal(replayRes.body.meta.idempotentReplay, true);

  const delSubmittedRes = await kaderClient.request(`/api/v1/measurements/drafts/${submittedId}`, {
    method: 'DELETE'
  });
  assert.equal(delSubmittedRes.status, 400);
  assert.equal(delSubmittedRes.body.error.code, 'CANNOT_DELETE_SUBMITTED_MEASUREMENT');

  const reviseRes = await kaderClient.request(`/api/v1/measurements/${submittedId}/revisions`, {
    method: 'POST',
    body: {
      weight_kg: 9.4,
      length_height_cm: 76.0,
      position: 'recumbent',
      correction_reason: 'Koreksi hasil pembacaan mistar infantometer.',
      expected_revision_no: 1
    }
  });
  assert.equal(reviseRes.status, 201);
  const rev2Id = reviseRes.body.data.measurement.id;
  assert.equal(reviseRes.body.data.measurement.revision_no, 2);
  assert.equal(reviseRes.body.data.measurement.supersedes_id, submittedId);

  const staleReviseRes = await kaderClient.request(`/api/v1/measurements/${submittedId}/revisions`, {
    method: 'POST',
    body: {
      weight_kg: 9.5,
      length_height_cm: 76.2,
      position: 'recumbent',
      correction_reason: 'Percobaan revisi pada versi yang sudah digantikan.'
    }
  });
  assert.equal(staleReviseRes.status, 409);

  const detailRes = await kaderClient.request(`/api/v1/measurements/${rev2Id}`);
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.data.measurement.id, rev2Id);
  assert.equal(detailRes.body.data.measurement.revision_no, 2);
  assert.equal(detailRes.body.data.revision_history.length, 2);

  const historyRes = await kaderClient.request(`/api/v1/children/${childId}/growth-history`);
  assert.equal(historyRes.status, 200);
  assert.equal(historyRes.body.data.activeHistory.length, 1);
  assert.equal(historyRes.body.data.activeHistory[0].measurement_id, rev2Id);
  assert.equal(historyRes.body.data.whoCurves.length, 61);
});

test('Fase 3, 4 & 5 (SCRUM-30, 42, 29, 31, 43, 44, 32, 33): monitoring, review, tindak lanjut, dashboard, ekspor CSV', async () => {
  const petugasClient = createSessionClient(baseUrl);
  await petugasClient.request('/api/v1/auth/login', {
    method: 'POST',
    body: { username: 'petugas.melati', password: '123456' }
  });

  const sessionsRes = await petugasClient.request('/api/v1/sessions');
  const openSession = sessionsRes.body.data.find((s) => s.status === 'open');
  const monRes = await petugasClient.request(`/api/v1/sessions/${openSession.id}/monitoring`);
  assert.equal(monRes.status, 200);
  assert.ok(typeof monRes.body.data.summary.coverage_percent === 'number');
  assert.ok(typeof monRes.body.data.summary.low_coverage_warning === 'boolean');

  const queueRes = await petugasClient.request('/api/v1/reviews/queue?review_status=pending');
  assert.equal(queueRes.status, 200);
  assert.ok(queueRes.body.data.items.length > 0);
  const targetReview = queueRes.body.data.items[0];

  const reviewRes = await petugasClient.request(
    `/api/v1/growth-assessments/${targetReview.assessment_id}/review`,
    {
      method: 'PATCH',
      body: {
        review_status: 'monitoring',
        review_notes: 'Jadwalkan pemberian PMT pemulihan dan konseling gizi keluarga.',
        create_follow_up: true,
        follow_up: {
          category: 'Pemberian PMT',
          description: 'Distribusi PMT telur & susu selama 14 hari.',
          due_date: '2026-11-28'
        }
      }
    }
  );
  assert.equal(reviewRes.status, 200);
  assert.ok(reviewRes.body.data.follow_up_id);
  const followUpId = reviewRes.body.data.follow_up_id;

  const updateFuRes = await petugasClient.request(`/api/v1/follow-ups/${followUpId}/updates`, {
    method: 'POST',
    body: { note: 'Kunjungan minggu pertama selesai, paket PMT diterima wali balita.' }
  });
  assert.equal(updateFuRes.status, 201);
  assert.equal(updateFuRes.body.data.status, 'in_progress');

  const closeFuRes = await petugasClient.request(`/api/v1/follow-ups/${followUpId}/close`, {
    method: 'PATCH',
    body: { closure_note: 'Evaluasi 14 hari selesai, berat dan tinggi badan balita meningkat.' }
  });
  assert.equal(closeFuRes.status, 200);
  assert.equal(closeFuRes.body.data.status, 'closed');

  const postCloseUpdate = await petugasClient.request(`/api/v1/follow-ups/${followUpId}/updates`, {
    method: 'POST',
    body: { note: 'Percobaan tambah progres setelah tugas ditutup.' }
  });
  assert.equal(postCloseUpdate.status, 409);
  assert.equal(postCloseUpdate.body.error.code, 'CONFLICT');

  const dashRes = await petugasClient.request('/api/v1/dashboard/stats?period=2026-11');
  assert.equal(dashRes.status, 200);
  assert.ok(dashRes.body.data.kpis.total_active_children > 0);
  assert.ok(Array.isArray(dashRes.body.data.stuntingTrend));
  assert.ok(dashRes.body.data.stuntingTrend.length > 0);

  const csvRes = await petugasClient.request('/api/v1/reports/export-csv?period=2026-11');
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.body, /periode,kode_organisasi,nama_organisasi/);
  assert.doesNotMatch(csvRes.body, /0812/);
});
