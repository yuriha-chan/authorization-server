import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..');
const AGENT_CLIENT_PATH = path.join(PROJECT_ROOT, 'scripts/agent-client.js');

function spawnCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn('node', [AGENT_CLIENT_PATH, ...args], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });

    child.on('error', (error) => {
      stderr += error.message;
      resolve({ stdout, stderr, exitCode: null });
    });
  });
}

describe('Agent Client CLI Integration Tests', () => {
  describe('list-grants command', () => {
    it('should recognize list-grants command with type parameter', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['list-grants', 'github']);

      expect(stderr).not.toContain('Unknown command');
      expect(stdout).toContain('Fetching GrantAPIs');
    }, 10000);

    it('should attempt HTTP request for list-grants command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['list-grants', 'github']);

      expect(stdout).toContain('Fetching GrantAPIs');
      expect(stdout).toContain('type=github');
    }, 10000);

    it('should exit with error code 2 when type parameter is missing', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['list-grants']);

      expect(exitCode).toBe(2);
      expect(stderr).toContain('type is required');
    }, 10000);

    it('should accept baseUrl parameter for list-grants command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'list-grants',
        'github',
        'https://api.github.com'
      ]);

      expect(stderr).not.toContain('Unknown command');
      expect(stdout).toContain('Fetching GrantAPIs');
      expect(stdout).toContain('baseUrl=https://api.github.com');
    }, 10000);

    it('should accept host and port options for list-grants command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'list-grants',
        'github',
        '--host',
        'custom-host.example.com',
        '--port',
        '3000'
      ]);

      expect(stderr).not.toContain('Unknown command');
      expect(stdout).toContain('Fetching GrantAPIs');
    }, 10000);
  });

  describe('request command', () => {
    it('should recognize request command with grantApiName, key, and repository parameters', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo[rw]'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
      expect(stderr).not.toContain('Unknown command');
    }, 10000);

    it('should not show argument parsing error for valid request command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo[rw]'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
      expect(stderr).not.toContain('Unknown command');
    }, 10000);

    it('should exit with error code 2 and show new format error when grantApiName parameter is missing', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['request', 'my-service-key', 'myrepo[rw]']);

      expect(exitCode).toBe(2);
      expect(stderr).toContain('grantApiName, key, and repository are required');
      expect(stdout).toContain('request <grantApiName> <key> <repository[rw]>');
    }, 10000);

    it('should exit with error code 2 and show new format error when key and repository parameters are missing', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['request', 'github-main']);

      expect(exitCode).toBe(2);
      expect(stderr).toContain('grantApiName, key, and repository are required');
      expect(stdout).toContain('request <grantApiName> <key> <repository[rw]>');
    }, 10000);

    it('should exit with error code 2 and show new format error when only repository parameter is missing', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key'
      ]);

      expect(exitCode).toBe(2);
      expect(stderr).toContain('grantApiName, key, and repository are required');
      expect(stdout).toContain('request <grantApiName> <key> <repository[rw]>');
    }, 10000);

    it('should exit with error code 2 and show new format error when all request parameters are missing', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['request']);

      expect(exitCode).toBe(2);
      expect(stderr).toContain('grantApiName, key, and repository are required');
      expect(stdout).toContain('request <grantApiName> <key> <repository[rw]>');
      expect(stdout).toContain('repository[rw]');
      expect(stdout).toContain('[rw]');
    }, 10000);

    it('should accept timeout option for request command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo[rw]',
        '--timeout',
        '5000'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
    }, 10000);

    it('should accept repository spec with read-only permissions [r]', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo[r]'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
      expect(stderr).not.toContain('Invalid repository spec');
    }, 10000);

    it('should accept repository spec with write-only permissions [w]', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo[w]'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
      expect(stderr).not.toContain('Invalid repository spec');
    }, 10000);

    it('should accept repository spec without permissions (defaults to read)', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
      expect(stderr).not.toContain('Invalid repository spec');
    }, 10000);

    it('should accept host and port options for request command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli([
        'request',
        'github-main',
        'my-service-key',
        'myrepo[rw]',
        '--host',
        'custom-host.example.com',
        '--port',
        '3000'
      ]);

      expect(stderr).not.toContain('grantApiName, key, and repository are required');
      expect(stderr).not.toContain('Unknown command');
    }, 10000);
  });

  describe('help text', () => {
    it('should include list-grants command in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('list-grants');
    }, 10000);

    it('should include list-grants command usage in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('list-grants <type> [baseUrl]');
    }, 10000);

    it('should include request command with grantApiName, key, and repository in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('request <grantApiName> <key> <repository[rw]>');
    }, 10000);

    it('should include repository format examples in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('repository[rw]');
      expect(stdout).toContain('[rw]');
      expect(stdout).toContain('myrepo');
      expect(stdout).toContain('myrepo[r]');
      expect(stdout).toContain('myrepo[w]');
    }, 10000);

    it('should NOT show old realm-spec format in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).not.toContain('realm-spec');
    }, 10000);

    it('should include list-grants description in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('List available GrantAPIs');
    }, 10000);

    it('should include request description in help output', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('Send request and wait for approval');
    }, 10000);
  });

  describe('unknown command handling', () => {
    it('should show Unknown command error for non-existent commands', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['nonexistent-command']);

      expect(exitCode).toBe(2);
      expect(stderr).toContain('Unknown command');
      expect(stderr).toContain('nonexistent-command');
    }, 10000);

    it('should show help after Unknown command error', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['invalid-cmd']);

      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('list-grants');
    }, 10000);
  });

  describe('init command', () => {
    it('should recognize init command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['init', '--help']);

      expect(stderr).not.toContain('Unknown command');
    }, 10000);

    it('should show init help information', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('init');
      expect(stdout).toContain('Generate keypair');
    }, 10000);
  });

  describe('register command', () => {
    it('should recognize register command', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['register', '--help']);

      expect(stderr).not.toContain('Unknown command');
    }, 10000);

    it('should show register help information', async () => {
      const { stdout, stderr, exitCode } = await spawnCli(['--help']);

      expect(stdout).toContain('register');
      expect(stdout).toContain('Register existing keypair');
    }, 10000);
  });
});
