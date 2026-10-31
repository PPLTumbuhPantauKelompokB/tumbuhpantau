import test from 'node:test';
import assert from 'node:assert/strict';
import { safeDemoOverview } from '../src/demo-data.js';

test('fixture demo secara eksplisit ditandai sintetis', () => {
  const data = safeDemoOverview();
  assert.equal(data.demo, true);
  assert.equal(data.source, 'synthetic-fixture');
  assert.ok(data.metrics.every((m) => Number.isFinite(m.value)));
  assert.ok(data.modules.every((m) => m.status === 'planned'));
});

test('respons demo tidak berbagi referensi objek yang dapat dimutasi', () => {
  const a = safeDemoOverview();
  a.metrics[0].value = 999;
  const b = safeDemoOverview();
  assert.equal(b.metrics[0].value, 128);
});
