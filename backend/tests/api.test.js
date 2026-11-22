import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { parsePort } from '../src/port.js';
import { safeDemoOverview } from '../src/demo-data.js';

test('parsePort mengembalikan port default dan memvalidasi rentang', () => {
  assert.equal(parsePort(), 3001);
  assert.equal(parsePort('3001'), 3001);
  assert.throws(() => parsePort('abc'), /PORT/);
  assert.throws(() => parsePort('70000'), /PORT/);
});

test('fixture safeDemoOverview menghasilkan data berstruktur valid', () => {
  const data = safeDemoOverview();
  assert.equal(data.demo, true);
  assert.equal(data.source, 'synthetic-fixture');
  assert.ok(Array.isArray(data.metrics));
  assert.ok(data.metrics.length > 0);
});

test('GET /api/health mengembalikan status ok', async () => {
  const app = createApp({
    checkDatabase: async () => ({ ok: true }),
    useMemorySession: true
  });

  const server = app.listen(0);
  const address = server.address();
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'connected');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/v1/ mengembalikan informasi layanan Sprint 1', async () => {
  const app = createApp({
    checkDatabase: async () => ({ ok: true }),
    useMemorySession: true
  });

  const server = app.listen(0);
  const address = server.address();
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.name.includes('Sprint 1'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Endpoint terlindungi mengembalikan 401 jika diakses tanpa autentikasi', async () => {
  const app = createApp({
    checkDatabase: async () => ({ ok: true }),
    useMemorySession: true
  });

  const server = app.listen(0);
  const address = server.address();
  const port = address.port;

  try {
    const endpoints = ['/api/v1/auth/me', '/api/v1/children', '/api/v1/sessions', '/api/v1/guardians'];
    for (const ep of endpoints) {
      const res = await fetch(`http://127.0.0.1:${port}${ep}`);
      assert.equal(res.status, 401, `Endpoint ${ep} harus menghasilkan status 401`);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.equal(body.error.code, 'UNAUTHORIZED');
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Endpoint tidak terdaftar mengembalikan 404 NOT_FOUND terstruktur', async () => {
  const app = createApp({
    checkDatabase: async () => ({ ok: true }),
    useMemorySession: true
  });

  const server = app.listen(0);
  const address = server.address();
  const port = address.port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/v1/not-a-real-route`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
