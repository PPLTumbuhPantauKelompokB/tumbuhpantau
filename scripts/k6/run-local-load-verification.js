import { performance } from 'node:perf_hooks';
import { createApp } from '../../backend/src/app.js';
import { closePool } from '../../backend/src/config/db.js';
import { seedDatabase } from '../../backend/scripts/seed.js';

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(idx, sortedValues.length - 1))];
}

function summarizeLatencies(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: sorted.length,
    minMs: Number((sorted[0] || 0).toFixed(2)),
    avgMs: Number((sorted.length ? sum / sorted.length : 0).toFixed(2)),
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
    maxMs: Number((sorted[sorted.length - 1] || 0).toFixed(2))
  };
}

async function prepareVirtualUserSession(vuId, baseUrl) {
  let cookieHeader = '';
  let csrfToken = '';

  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: vuId % 2 === 0 ? 'kader.mlt01' : 'petugas.melati',
      password: '123456'
    })
  });

  if (loginRes.status !== 200) {
    throw new Error(`Setup login gagal untuk VU #${vuId}: status ${loginRes.status}`);
  }

  const setCookie = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  if (setCookie.length > 0) {
    cookieHeader = setCookie.map((c) => c.split(';')[0]).join('; ');
  }
  const loginBody = await loginRes.json();
  csrfToken = loginBody?.data?.csrfToken || '';

  return { vuId, cookieHeader, csrfToken };
}

async function runVirtualUser(session, baseUrl, iterations, metrics) {
  const { cookieHeader, csrfToken } = session;

  for (let i = 0; i < iterations; i += 1) {
    const previewStart = performance.now();
    const previewRes = await fetch(`${baseUrl}/api/v1/measurements/preview`, {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        'x-csrf-token': csrfToken,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        birth_date: '2025-05-10',
        measured_at: '2026-11-11',
        sex: i % 2 === 0 ? 'L' : 'P',
        weight_kg: 9.2 + (i % 5) * 0.1,
        length_height_cm: 74.8 + (i % 5) * 0.3,
        position: 'recumbent'
      })
    });
    metrics.measurementPreview.push(performance.now() - previewStart);
    if (previewRes.status !== 200) {
      metrics.failures += 1;
    }

    const dashStart = performance.now();
    const dashRes = await fetch(`${baseUrl}/api/v1/dashboard/stats?period=2026-11`, {
      headers: { cookie: cookieHeader }
    });
    metrics.dashboardStats.push(performance.now() - dashStart);
    if (dashRes.status !== 200) {
      metrics.failures += 1;
    }

    const csvStart = performance.now();
    const csvRes = await fetch(`${baseUrl}/api/v1/reports/export-csv?period=2026-11`, {
      headers: { cookie: cookieHeader }
    });
    const csvText = await csvRes.text();
    metrics.csvExport.push(performance.now() - csvStart);

    if (
      csvRes.status !== 200 ||
      !csvText.includes('periode,kode_organisasi,nama_organisasi') ||
      csvText.toLowerCase().includes('nik')
    ) {
      metrics.failures += 1;
      metrics.csvErrors += 1;
    }
  }
}

async function main() {
  const VUS = 20;
  const ITERATIONS_PER_VU = 5;

  await seedDatabase();
  const app = createApp({ useMemorySession: true });
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const metrics = {
    measurementPreview: [],
    dashboardStats: [],
    csvExport: [],
    failures: 0,
    csvErrors: 0
  };

  let totalDurationMs = 0;
  try {
    const sessions = [];
    for (let idx = 1; idx <= VUS; idx += 1) {
      sessions.push(await prepareVirtualUserSession(idx, baseUrl));
    }

    const startedAt = performance.now();
    await Promise.all(
      sessions.map((sess) => runVirtualUser(sess, baseUrl, ITERATIONS_PER_VU, metrics))
    );
    totalDurationMs = Number((performance.now() - startedAt).toFixed(2));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await seedDatabase();
    await closePool();
  }

  const allLatencies = [
    ...metrics.measurementPreview,
    ...metrics.dashboardStats,
    ...metrics.csvExport
  ];

  const report = {
    timestamp: new Date().toISOString(),
    virtualUsers: VUS,
    iterationsPerVu: ITERATIONS_PER_VU,
    totalRequests: allLatencies.length,
    totalDurationMs,
    failures: metrics.failures,
    csvErrors: metrics.csvErrors,
    overall: summarizeLatencies(allLatencies),
    scenarios: {
      measurement_preview: summarizeLatencies(metrics.measurementPreview),
      dashboard_stats: summarizeLatencies(metrics.dashboardStats),
      csv_export: summarizeLatencies(metrics.csvExport)
    }
  };

  console.log(JSON.stringify(report, null, 2));

  if (metrics.failures > 0 || report.overall.p95Ms > 2000) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
