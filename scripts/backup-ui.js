import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'frontend', 'src');
const backupDir = path.join(rootDir, 'frontend', '.ui-snapshot-original');

if (existsSync(backupDir)) {
  console.log('Snapshot UI asli sudah tersimpan di frontend/.ui-snapshot-original (tidak ditimpa agar versi awal tetap aman).');
  process.exit(0);
}

cpSync(srcDir, backupDir, { recursive: true });
console.log('Berhasil menyimpan snapshot tampilan UI asli ke frontend/.ui-snapshot-original.');
