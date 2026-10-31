import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePort } from '../src/port.js';

test('port default dan batas port valid', () => {
  assert.equal(parsePort(), 3001);
  for (const value of ['1', '3001', '65535']) assert.equal(parsePort(value), Number(value));
});

test('port tidak lengkap, pecahan, atau di luar batas ditolak', () => {
  for (const value of ['', '3001abc', '3001.5', '0', '-1', '65536']) {
    assert.throws(() => parsePort(value), /PORT/);
  }
});
