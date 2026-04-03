const { spawn } = require('child_process');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const AGENT_PORT = process.env.AGENT_PORT || '9080';
const ADMIN_PORT = process.env.ADMIN_PORT || '9081';
const DB_PATH = process.env.DB_PATH || path.join(PROJECT_ROOT, 'data/auth.db');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('Starting servers via index.js...');
console.log(`AGENT_PORT: ${AGENT_PORT}`);
console.log(`ADMIN_PORT: ${ADMIN_PORT}`);
console.log(`DB_PATH: ${DB_PATH}`);
console.log(`REDIS_URL: ${REDIS_URL}`);

const env = {
  ...process.env,
  AGENT_PORT,
  ADMIN_PORT,
  DB_PATH,
  REDIS_URL,
};

const serverProcess = spawn('node', [path.join(PROJECT_ROOT, 'dist/index.js')], {
  env,
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: PROJECT_ROOT,
});

serverProcess.stdout.on('data', (data) => console.log(`[Server] ${data}`));
serverProcess.stderr.on('data', (data) => console.error(`[Server Error] ${data}`));

serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});
