import { describe, it, expect } from 'vitest';
import { GrantApiType } from '../src/entities/GrantApiType';

describe('GrantApiType Entity', () => {
  it('should have an id property', () => {
    const grantApiType = new GrantApiType();
    expect(grantApiType).toHaveProperty('id');
  });

  it('should have a name property', () => {
    const grantApiType = new GrantApiType();
    grantApiType.name = 'test-type';
    expect(grantApiType.name).toBe('test-type');
  });

  it('should have a grantCode property', () => {
    const grantApiType = new GrantApiType();
    grantApiType.grantCode = 'console.log("grant");';
    expect(grantApiType.grantCode).toBe('console.log("grant");');
  });

  it('should have a revokeCode property', () => {
    const grantApiType = new GrantApiType();
    grantApiType.revokeCode = 'console.log("revoke");';
    expect(grantApiType.revokeCode).toBe('console.log("revoke");');
  });

  it('should have a getStatusCode property', () => {
    const grantApiType = new GrantApiType();
    grantApiType.getStatusCode = 'console.log("status");';
    expect(grantApiType.getStatusCode).toBe('console.log("status");');
  });

  it('should have createdAt property', () => {
    const grantApiType = new GrantApiType();
    expect(grantApiType).toHaveProperty('createdAt');
  });

  it('should have updatedAt property', () => {
    const grantApiType = new GrantApiType();
    expect(grantApiType).toHaveProperty('updatedAt');
  });

  it('should accept valid JavaScript code in operation fields', () => {
    const grantApiType = new GrantApiType();
    grantApiType.name = 'github';
    grantApiType.grantCode = `
      async function grant(secrets, account, realm) {
        return { token: secrets.token, expires: Date.now() + 3600000 };
      }
    `;
    grantApiType.revokeCode = `
      async function revoke(secrets, account, token) {
        return { revoked: true };
      }
    `;
    grantApiType.getStatusCode = `
      async function getStatus(secrets, account, token) {
        return { active: true };
      }
    `;

    expect(grantApiType.name).toBe('github');
    expect(grantApiType.grantCode).toContain('async function grant');
    expect(grantApiType.revokeCode).toContain('async function revoke');
    expect(grantApiType.getStatusCode).toContain('async function getStatus');
  });
});
