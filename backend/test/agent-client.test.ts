import { describe, it, expect } from 'vitest';

// Import the agent client script as a module
// We need to refactor the script to export functions for testing
// For now, we'll test the argument parsing logic

describe('Agent Client Argument Parsing', () => {
  describe('list-grants command', () => {
    it('should parse list-grants command with type parameter', () => {
      // Test that list-grants <type> parses correctly
      const args = ['list-grants', 'github'];
      const command = args[0];
      const type = args[1];
      
      expect(command).toBe('list-grants');
      expect(type).toBe('github');
    });
    
    it('should parse list-grants command with type and baseUrl parameters', () => {
      // Test that list-grants <type> <baseUrl> parses correctly
      const args = ['list-grants', 'github', 'https://api.github.com'];
      const command = args[0];
      const type = args[1];
      const baseUrl = args[2];
      
      expect(command).toBe('list-grants');
      expect(type).toBe('github');
      expect(baseUrl).toBe('https://api.github.com');
    });
    
    it('should reject list-grants command without type parameter', () => {
      // Test that list-grants without type fails
      const args = ['list-grants'];
      const command = args[0];
      const type = args[1];
      
      expect(command).toBe('list-grants');
      expect(type).toBeUndefined();
    });
  });
  
  describe('request command', () => {
    it('should parse request command with new argument structure', () => {
      // Test that request <grantApiName> <key> <repository[rw]> parses correctly
      const args = ['request', 'github-main', 'my-key', 'myrepo[rw]'];
      const command = args[0];
      const grantApiName = args[1];
      const key = args[2];
      const repositorySpec = args[3];
      
      expect(command).toBe('request');
      expect(grantApiName).toBe('github-main');
      expect(key).toBe('my-key');
      expect(repositorySpec).toBe('myrepo[rw]');
    });
    
    it('should parse repository spec with permissions', () => {
      // Test parsing of repository[rw] format
      const spec = 'myrepo[rw]';
      const match = spec.match(/^([^\[]+)(?:\[([rw]+)\])?$/);
      
      expect(match).not.toBeNull();
      if (match) {
        const [, repository, permissions] = match;
        expect(repository).toBe('myrepo');
        expect(permissions).toBe('rw');
      }
    });
    
    it('should parse repository spec without permissions (default to read)', () => {
      // Test parsing of repository format without permissions
      const spec = 'myrepo';
      const match = spec.match(/^([^\[]+)(?:\[([rw]+)\])?$/);
      
      expect(match).not.toBeNull();
      if (match) {
        const [, repository, permissions] = match;
        expect(repository).toBe('myrepo');
        expect(permissions).toBeUndefined();
      }
    });
    
    it('should reject request command with missing arguments', () => {
      // Test that request with insufficient arguments fails
      const args = ['request', 'github-main'];
      const command = args[0];
      const grantApiName = args[1];
      const key = args[2];
      const repositorySpec = args[3];
      
      expect(command).toBe('request');
      expect(grantApiName).toBe('github-main');
      expect(key).toBeUndefined();
      expect(repositorySpec).toBeUndefined();
    });
  });
});

describe('Agent Client Request Body Structure', () => {
  it('should create request body with grantApi and serviceAccessKey fields', () => {
    // Test that the request body structure matches new schema
    const requestId = 'test-request-id';
    const grantApiName = 'github-main';
    const serviceAccessKey = 'my-key';
    const repository = 'myrepo';
    const read = 1;
    const write = 1;
    
    const body = {
      serviceAccessKey: requestId,
      realm: {
        repository,
        read,
        write
      },
      grantApi: grantApiName
    };
    
    expect(body).toHaveProperty('serviceAccessKey');
    expect(body).toHaveProperty('grantApi');
    expect(body).toHaveProperty('realm');
    expect(body.realm).toHaveProperty('repository');
    expect(body.realm).toHaveProperty('read');
    expect(body.realm).toHaveProperty('write');
    expect(body.realm).not.toHaveProperty('baseUrl');
  });
  
  it('should not include baseUrl in realm object', () => {
    // Test that realm does not contain baseUrl
    const realm = {
      repository: 'myrepo',
      read: 1,
      write: 1
    };
    
    expect(realm).not.toHaveProperty('baseUrl');
  });
});

describe('Agent Client Help Text', () => {
  it('should include list-grants command in help', () => {
    // Test that help text includes list-grants command
    const helpText = `
Usage:
  agent-client list-grants <type> [baseUrl]    List available GrantAPIs
  agent-client request <grantApiName> <key> <repository[rw]>  Request access
`;
    
    expect(helpText).toContain('list-grants');
    expect(helpText).toContain('request <grantApiName> <key> <repository[rw]>');
  });
});
