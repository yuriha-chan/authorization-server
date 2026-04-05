import { describe, it, expect } from 'vitest';
import { grantApiTypeSchema, type GrantApiTypeInput } from '../src/schemas';
import { z } from 'zod';

describe('GrantApiType Schema', () => {
  const validGrantApiType: GrantApiTypeInput = {
    name: 'github',
    grantCode: 'async function grant(secrets, account, realm) { return {}; }',
    revokeCode: 'async function revoke(secrets, account, token) { return {}; }',
    getStatusCode: 'async function getStatus(secrets, account, token) { return {}; }',
  };

  it('should validate a valid GrantApiType', () => {
    const result = grantApiTypeSchema.safeParse(validGrantApiType);
    expect(result.success).toBe(true);
  });

  it('should reject when name is empty', () => {
    const invalid = { ...validGrantApiType, name: '' };
    const result = grantApiTypeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name');
    }
  });

  it('should reject when name is missing', () => {
    const { name, ...invalid } = validGrantApiType;
    const result = grantApiTypeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should reject when grantCode is empty', () => {
    const invalid = { ...validGrantApiType, grantCode: '' };
    const result = grantApiTypeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('grantCode');
    }
  });

  it('should reject when revokeCode is empty', () => {
    const invalid = { ...validGrantApiType, revokeCode: '' };
    const result = grantApiTypeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('revokeCode');
    }
  });

  it('should reject when getStatusCode is empty', () => {
    const invalid = { ...validGrantApiType, getStatusCode: '' };
    const result = grantApiTypeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('getStatusCode');
    }
  });

  it('should accept valid JavaScript code strings', () => {
    const withComplexCode = {
      name: 'custom-api',
      grantCode: `
        async function grant(secrets, account, realm) {
          const response = await fetch(secrets.endpoint + '/token', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + secrets.token }
          });
          return response.json();
        }
      `,
      revokeCode: `
        async function revoke(secrets, account, token) {
          await fetch(secrets.endpoint + '/revoke', {
            method: 'POST',
            body: JSON.stringify({ token })
          });
          return { revoked: true };
        }
      `,
      getStatusCode: `
        async function getStatus(secrets, account, token) {
          const response = await fetch(secrets.endpoint + '/status?token=' + token);
          return response.json();
        }
      `,
    };
    const result = grantApiTypeSchema.safeParse(withComplexCode);
    expect(result.success).toBe(true);
  });

  it('should reject when name exceeds 100 characters', () => {
    const invalid = { ...validGrantApiType, name: 'a'.repeat(101) };
    const result = grantApiTypeSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('should accept name at exactly 100 characters', () => {
    const valid = { ...validGrantApiType, name: 'a'.repeat(100) };
    const result = grantApiTypeSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});
