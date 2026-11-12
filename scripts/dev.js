import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

const backendProc = spawn(process.execPath, ['--watch', 'src/server.js'], {
  cwd: backendDir,
  stdio: 'inherit'
});

const frontendProc = spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
  cwd: frontendDir,
  stdio: 'inherit'
});

function shutdown() {
  if (!backendProc.killed) backendProc.kill();
  if (!frontendProc.killed) frontendProc.kill();
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

backendProc.on('exit', (code) => {
  if (code && code !== 0) {
    shutdown();
    process.exit(code);
  }
});

frontendProc.on('exit', (code) => {
  if (code && code !== 0) {
    shutdown();
    process.exit(code);
  }
});
