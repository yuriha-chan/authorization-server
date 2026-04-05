import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.join(__dirname, '../..');
const AGENT_CLIENT = path.join(PROJECT_ROOT, 'backend/scripts/agent-client.js');

function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', [AGENT_CLIENT, ...args], {
      env: { ...process.env, HOME: '/tmp' }
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (d) => stdout += d.toString());
    child.stderr?.on('data', (d) => stderr += d.toString());
    
    child.on('close', (code) => {
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

describe('Agent Client CLI - list-grants command', () => {
  it('should recognize list-grants as a valid command', async () => {
    // This test will FAIL because list-grants command doesn't exist yet
    // Expected: command is recognized
    // Actual: "Unknown command: list-grants"
    const result = await runCli(['list-grants', 'github']);
    
    expect(result.stderr).not.toContain('Unknown command');
  });
  
  it('should require type parameter for list-grants', async () => {
    // This test will FAIL because list-grants command doesn't exist yet
    // Expected: error about missing type parameter, exit code 2
    // Actual: "Unknown command: list-grants"
    const result = await runCli(['list-grants']);
    
    expect(result.code).toBe(2);
    expect(result.stderr).toContain('type');
  });
  
  it('should show list-grants in help text', async () => {
    // This test will FAIL because help text doesn't include list-grants yet
    // Expected: help text contains "list-grants"
    // Actual: help text only shows init, register, request
    const result = await runCli(['--help']);
    
    expect(result.stdout).toContain('list-grants');
    expect(result.stdout).toContain('List available GrantAPIs');
  });
});

describe('Agent Client CLI - updated request command', () => {
  it('should accept new argument structure: request <grantApiName> <key> <repository[rw]>', async () => {
    // This test will FAIL because request command still expects old format
    // Expected: command accepts grantApiName, key, repository[rw]
    // Actual: command expects type, realm-spec
    const result = await runCli(['request', 'github-main', 'my-key', 'myrepo[rw]']);
    
    // Should NOT show the old error about "type and realm-spec are required"
    expect(result.stderr).not.toContain('type and realm-spec are required');
  });
  
  it('should show updated request signature in help text', async () => {
    // This test will FAIL because help text shows old signature
    // Expected: "request <grantApiName> <key> <repository[rw]>"
    // Actual: "request <type> <realm-spec>"
    const result = await runCli(['--help']);
    
    expect(result.stdout).toContain('request <grantApiName> <key> <repository[rw]>');
    expect(result.stdout).not.toContain('request <type> <realm-spec>');
  });
});
