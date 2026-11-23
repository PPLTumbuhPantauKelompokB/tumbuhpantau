import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'frontend', 'src');
const backupDir = path.join(rootDir, 'frontend', '.ui-snapshot-original');

if (!existsSync(backupDir)) {
  console.error('Snapshot tampilan UI asli (frontend/.ui-snapshot-original) tidak ditemukan.');
  process.exit(1);
}

rmSync(srcDir, { recursive: true, force: true });
cpSync(backupDir, srcDir, { recursive: true });
console.log('Tampilan UI berhasil dikembalikan 100% ke versi sebelum revisi (frontend/src).');
