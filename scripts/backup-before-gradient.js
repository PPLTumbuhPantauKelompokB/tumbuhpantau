import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'frontend', 'src');
const backupDir = path.join(rootDir, 'frontend', '.ui-snapshot-before-gradient');

rmSync(backupDir, { recursive: true, force: true });
cpSync(srcDir, backupDir, { recursive: true });
console.log('Berhasil menyimpan snapshot UI sebelum eksperimen gradient ke frontend/.ui-snapshot-before-gradient.');
