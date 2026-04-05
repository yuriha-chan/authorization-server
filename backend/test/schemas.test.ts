import { describe, it, expect } from 'vitest';
import { requestSchema, grantSchema } from '../src/schemas';

describe('Request Schema - Updated Structure', () => {
  describe('New format with grantApi field', () => {
    it('should validate valid request with grantApi field', () => {
      const validRequest = {
        serviceAccessKey: 'valid-public-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate request with read=0 and write=1', () => {
      const validRequest = {
        serviceAccessKey: 'another-key',
        realm: {
          repository: 'org/project',
          read: 0,
          write: 1,
        },
        grantApi: 'custom-api',
      };

      const result = requestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate request with read=0 and write=0', () => {
      const validRequest = {
        serviceAccessKey: 'key-with-no-perms',
        realm: {
          repository: 'org/repo',
          read: 0,
          write: 0,
        },
        grantApi: 'readonly-api',
      };

      const result = requestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject when grantApi is empty string', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: '',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when grantApi is missing', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Old format rejection', () => {
    it('should reject old format with type field instead of grantApi', () => {
      const oldFormatRequest = {
        codeAccessPublicKey: 'valid-public-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
          baseUrl: 'https://api.github.com',
        },
        type: 'github',
      };

      const result = requestSchema.safeParse(oldFormatRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when type field is present', () => {
      const requestWithType = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        type: 'github',
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(requestWithType);
      expect(result.success).toBe(false);
    });
  });

  describe('serviceAccessKey field', () => {
    it('should accept valid serviceAccessKey', () => {
      const validRequest = {
        serviceAccessKey: 'valid-public-key-string',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject when serviceAccessKey is empty', () => {
      const invalidRequest = {
        serviceAccessKey: '',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when serviceAccessKey is missing', () => {
      const invalidRequest = {
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject old codeAccessPublicKey field name', () => {
      const requestWithOldFieldName = {
        codeAccessPublicKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(requestWithOldFieldName);
      expect(result.success).toBe(false);
    });
  });

  describe('Realm schema without baseUrl', () => {
    it('should validate realm without baseUrl', () => {
      const validRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject realm with baseUrl field', () => {
      const requestWithBaseUrl = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
          baseUrl: 'https://api.github.com',
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(requestWithBaseUrl);
      expect(result.success).toBe(false);
    });

    it('should reject when repository is empty', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: '',
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when repository is missing', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          read: 1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when read is not an integer', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 0.5,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when read is greater than 1', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 2,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when read is negative', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: -1,
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when write is not an integer', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0.5,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when write is greater than 1', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 2,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when write is negative', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: -1,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when read is missing', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          write: 0,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject when write is missing', () => {
      const invalidRequest = {
        serviceAccessKey: 'valid-key',
        realm: {
          repository: 'owner/repo',
          read: 1,
        },
        grantApi: 'github',
      };

      const result = requestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should reject empty object', () => {
      const result = requestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = requestSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined', () => {
      const result = requestSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });

    it('should reject array', () => {
      const result = requestSchema.safeParse([]);
      expect(result.success).toBe(false);
    });

    it('should reject string', () => {
      const result = requestSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = requestSchema.safeParse(123);
      expect(result.success).toBe(false);
    });
  });
});

describe('Grant Schema - Updated with description', () => {
  const validGrant = {
    type: 'oauth',
    baseURL: 'https://api.example.com',
    secret: 'supersecret',
    account: 'user123',
    name: 'Example Grant',
  };

  it('should validate grant without description (backward compatibility)', () => {
    const result = grantSchema.safeParse(validGrant);
    expect(result.success).toBe(true);
  });

  it('should validate grant with description', () => {
    const grantWithDescription = {
      ...validGrant,
      description: 'This is a grant description',
    };

    const result = grantSchema.safeParse(grantWithDescription);
    expect(result.success).toBe(true);
  });

  it('should validate grant with empty description', () => {
    const grantWithEmptyDescription = {
      ...validGrant,
      description: '',
    };

    const result = grantSchema.safeParse(grantWithEmptyDescription);
    expect(result.success).toBe(true);
  });

  it('should validate grant with long description', () => {
    const grantWithLongDescription = {
      ...validGrant,
      description: 'a'.repeat(1000),
    };

    const result = grantSchema.safeParse(grantWithLongDescription);
    expect(result.success).toBe(true);
  });

  it('should still require all mandatory fields when description is present', () => {
    const invalidGrant = {
      description: 'Some description',
      type: 'oauth',
    };

    const result = grantSchema.safeParse(invalidGrant);
    expect(result.success).toBe(false);
  });

  it('should reject invalid baseURL even with description', () => {
    const invalidGrant = {
      ...validGrant,
      description: 'Valid description',
      baseURL: 'not-a-url',
    };

    const result = grantSchema.safeParse(invalidGrant);
    expect(result.success).toBe(false);
  });
});
