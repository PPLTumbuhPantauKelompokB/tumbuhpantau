import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    sprint2_operational_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '10s', target: 20 },
        { duration: '25s', target: 20 },
        { duration: '5s', target: 0 }
      ],
      gracefulRampDown: '5s'
    }
  },
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<=2000'],
    'http_req_duration{scenario_step:measurement_preview}': ['p(95)<=2000'],
    'http_req_duration{scenario_step:dashboard_stats}': ['p(95)<=2000'],
    'http_req_duration{scenario_step:csv_export}': ['p(95)<=2000']
  }
};

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:3001';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: __ENV.LOAD_USERNAME || 'petugas.melati',
      password: __ENV.LOAD_PASSWORD || '123456'
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  check(loginRes, {
    'setup login status 200': (r) => r.status === 200
  });

  const body = loginRes.json();
  return {
    csrfToken: body?.data?.csrfToken || ''
  };
}

export default function (authData) {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: __ENV.LOAD_USERNAME || 'petugas.melati',
      password: __ENV.LOAD_PASSWORD || '123456'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { scenario_step: 'auth_login' }
    }
  );

  const loginBody = loginRes.json();
  const csrfToken = loginBody?.data?.csrfToken || authData.csrfToken;

  const previewRes = http.post(
    `${BASE_URL}/api/v1/measurements/preview`,
    JSON.stringify({
      birth_date: '2025-05-10',
      measured_at: '2026-11-11',
      sex: 'L',
      weight_kg: 9.4,
      length_height_cm: 75.5,
      position: 'recumbent'
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      tags: { scenario_step: 'measurement_preview' }
    }
  );

  check(previewRes, {
    'preview Z-Score status 200': (r) => r.status === 200,
    'preview mengembalikan zScore valid': (r) => typeof r.json()?.data?.zScore === 'number'
  });

  const dashboardRes = http.get(`${BASE_URL}/api/v1/dashboard/stats?period=2026-11`, {
    tags: { scenario_step: 'dashboard_stats' }
  });

  check(dashboardRes, {
    'dashboard stats status 200': (r) => r.status === 200,
    'dashboard mengembalikan KPI': (r) => r.json()?.success === true
  });

  const csvRes = http.get(`${BASE_URL}/api/v1/reports/export-csv?period=2026-11`, {
    tags: { scenario_step: 'csv_export' }
  });

  check(csvRes, {
    'ekspor CSV status 200': (r) => r.status === 200,
    'ekspor CSV memiliki header valid tanpa NIK': (r) =>
      r.body && r.body.includes('periode,kode_organisasi,nama_organisasi') && !r.body.includes('nik')
  });

  sleep(0.5);
}
