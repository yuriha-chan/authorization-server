// src/index.ts
import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { randomBytes } from 'crypto';
import { AppDataSource } from './db/data-source';

function generateApiKey(): string {
  return randomBytes(32).toString('base64');
}

async function main() {
  await AppDataSource.initialize();
  console.log('Database initialized');

  if (!process.env.ADMIN_API_KEY) {
    const apiKey = generateApiKey();
    process.env.ADMIN_API_KEY = apiKey;
    const adminPort = process.env.ADMIN_PORT || '8081';
    console.log(`Admin API Key generated: http://localhost:${adminPort}/?key=${encodeURIComponent(apiKey)}`);
  }

  const agentEnv = process.env;
  const adminEnv = process.env;

  const agentProcess = fork(path.join(__dirname, 'agent/server.js'), {
    env: agentEnv,
    stdio: 'pipe'
  });

  const adminProcess = fork(path.join(__dirname, 'admin/server.js'), {
    env: adminEnv,
    stdio: 'pipe'
  });

  // transfer subprocess logs
  agentProcess.stdout?.on('data', (data) => {
    console.log(`[Agent] ${data.toString().trim()}`);
  });

  agentProcess.stderr?.on('data', (data) => {
    console.error(`[Agent] ${data.toString().trim()}`);
  });

  adminProcess.stdout?.on('data', (data) => {
    console.log(`[Admin] ${data.toString().trim()}`);
  });

  adminProcess.stderr?.on('data', (data) => {
    console.error(`[Admin] ${data.toString().trim()}`);
  });

  // auto-restart subprocesses
  const restart = (proc: ChildProcess, name: string, env: NodeJS.ProcessEnv) => {
    proc.on('exit', (code: number | null) => {
      console.log(`${name} process exited with code ${code}, restarting...`);
      const newProc = fork(path.join(__dirname, `${name.toLowerCase()}/server.js`), {
        env: env,
        stdio: 'pipe'
      });

      // Restart log transfer
      newProc.stdout?.on('data', (data) => {
        console.log(`[${name}] ${data.toString().trim()}`);
      });
      newProc.stderr?.on('data', (data) => {
        console.error(`[${name}] ${data.toString().trim()}`);
      });

      restart(newProc, name, env);
    });
  };

  restart(agentProcess, 'Agent', agentEnv);
  restart(adminProcess, 'Admin', adminEnv);
  
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    agentProcess.kill('SIGTERM');
    adminProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    agentProcess.kill('SIGINT');
    adminProcess.kill('SIGINT');
    process.exit(0);
  });
  
  console.log('Authorization Server started');
}

main().catch(console.error);
