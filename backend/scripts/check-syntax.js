import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const targetDirs = ['src', 'scripts', 'tests'];

function collectJsFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectJsFiles(fullPath, files);
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = [];
for (const dir of targetDirs) {
  allFiles.push(...collectJsFiles(join(rootDir, dir)));
}

let failed = false;
for (const file of allFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failed = true;
    console.error(`Syntax error in ${relative(rootDir, file)}:`);
    console.error(error.stderr?.toString() || error.message);
  }
}

if (failed) {
  process.exit(1);
}
console.log(`Syntax check passed for ${allFiles.length} backend files.`);
