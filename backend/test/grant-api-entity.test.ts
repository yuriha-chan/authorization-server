import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource } from 'typeorm';
import { GrantAPI } from '../src/entities/GrantAPI';
import { GrantApiType } from '../src/entities/GrantApiType';

describe('GrantAPI Entity', () => {
  let testDataSource: DataSource;

  beforeAll(async () => {
    testDataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      logging: false,
      entities: [GrantAPI, GrantApiType],
    });

    await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const grantApiRepository = testDataSource.getRepository(GrantAPI);
    const grantApiTypeRepository = testDataSource.getRepository(GrantApiType);
    
    await grantApiRepository.clear();
    await grantApiTypeRepository.clear();
  });

  async function createTestType(name: string): Promise<GrantApiType> {
    const grantApiTypeRepository = testDataSource.getRepository(GrantApiType);
    const type = grantApiTypeRepository.create({
      name,
      grantCode: 'async function grant() { return {}; }',
      revokeCode: 'async function revoke() { return {}; }',
      getStatusCode: 'async function getStatus() { return {}; }',
    });
    return await grantApiTypeRepository.save(type);
  }

  describe('Description Field', () => {
    it('should create GrantAPI with description field', async () => {
      const type = await createTestType('test-type-desc');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-with-desc',
        description: 'This is a test description for the grant API',
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.id).toBeDefined();
      expect(savedGrant.description).toBe('This is a test description for the grant API');
    });

    it('should create GrantAPI without description field (optional)', async () => {
      const type = await createTestType('test-type-no-desc');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-no-desc',
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.id).toBeDefined();
      expect(savedGrant.description).toBeNull();
    });

    it('should update description field', async () => {
      const type = await createTestType('test-type-update');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-update-desc',
        description: 'Initial description',
      });

      const savedGrant = await grantApiRepository.save(grant);
      savedGrant.description = 'Updated description';
      const updatedGrant = await grantApiRepository.save(savedGrant);

      expect(updatedGrant.description).toBe('Updated description');
    });

    it('should accept empty string as description', async () => {
      const type = await createTestType('test-type-empty');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-empty-desc',
        description: '',
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.description).toBe('');
    });

    it('should accept long description text', async () => {
      const type = await createTestType('test-type-long');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);
      const longDescription = 'A'.repeat(1000);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-long-desc',
        description: longDescription,
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.description).toBe(longDescription);
    });
  });

  describe('Name Uniqueness Constraint', () => {
    it('should enforce unique name constraint', async () => {
      const type = await createTestType('test-type-unique');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant1 = grantApiRepository.create({
        type,
        baseURL: 'https://api1.example.com',
        secret: 'test-secret-1',
        account: 'test-account-1',
        name: 'unique-grant-name',
      });

      await grantApiRepository.save(grant1);

      const grant2 = grantApiRepository.create({
        type,
        baseURL: 'https://api2.example.com',
        secret: 'test-secret-2',
        account: 'test-account-2',
        name: 'unique-grant-name',
      });

      await expect(grantApiRepository.save(grant2)).rejects.toThrow();
    });

    it('should allow different names without error', async () => {
      const type = await createTestType('test-type-different');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant1 = grantApiRepository.create({
        type,
        baseURL: 'https://api1.example.com',
        secret: 'test-secret-1',
        account: 'test-account-1',
        name: 'grant-name-1',
      });

      const grant2 = grantApiRepository.create({
        type,
        baseURL: 'https://api2.example.com',
        secret: 'test-secret-2',
        account: 'test-account-2',
        name: 'grant-name-2',
      });

      const savedGrant1 = await grantApiRepository.save(grant1);
      const savedGrant2 = await grantApiRepository.save(grant2);

      expect(savedGrant1.id).toBeDefined();
      expect(savedGrant2.id).toBeDefined();
      expect(savedGrant1.name).toBe('grant-name-1');
      expect(savedGrant2.name).toBe('grant-name-2');
    });

    it('should allow same name after deleting first grant', async () => {
      const type = await createTestType('test-type-reuse');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'reusable-grant-name',
      });

      const savedGrant = await grantApiRepository.save(grant);
      await grantApiRepository.remove(savedGrant);

      const newGrant = grantApiRepository.create({
        type,
        baseURL: 'https://api2.example.com',
        secret: 'test-secret-2',
        account: 'test-account-2',
        name: 'reusable-grant-name',
      });

      const savedNewGrant = await grantApiRepository.save(newGrant);
      expect(savedNewGrant.name).toBe('reusable-grant-name');
    });

    it('should throw error with duplicate name on update', async () => {
      const type = await createTestType('test-type-update-unique');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant1 = grantApiRepository.create({
        type,
        baseURL: 'https://api1.example.com',
        secret: 'test-secret-1',
        account: 'test-account-1',
        name: 'original-name-1',
      });

      const grant2 = grantApiRepository.create({
        type,
        baseURL: 'https://api2.example.com',
        secret: 'test-secret-2',
        account: 'test-account-2',
        name: 'original-name-2',
      });

      await grantApiRepository.save(grant1);
      await grantApiRepository.save(grant2);

      grant2.name = 'original-name-1';

      await expect(grantApiRepository.save(grant2)).rejects.toThrow();
    });
  });

  describe('Entity Properties', () => {
    it('should have all required properties', async () => {
      const type = await createTestType('test-type-props');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-props',
        description: 'Test description',
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.id).toBeDefined();
      expect(savedGrant.type).toBeDefined();
      expect(savedGrant.baseURL).toBe('https://api.example.com');
      expect(savedGrant.secret).toBe('test-secret');
      expect(savedGrant.account).toBe('test-account');
      expect(savedGrant.name).toBe('test-grant-props');
      expect(savedGrant.description).toBe('Test description');
      expect(savedGrant.defaultRevokeTime).toBe(86400000);
      expect(savedGrant.state).toBe('active');
      expect(savedGrant.createdAt).toBeInstanceOf(Date);
      expect(savedGrant.updatedAt).toBeInstanceOf(Date);
    });

    it('should set custom defaultRevokeTime', async () => {
      const type = await createTestType('test-type-revoke');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-revoke',
        defaultRevokeTime: 3600000,
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.defaultRevokeTime).toBe(3600000);
    });

    it('should set custom state', async () => {
      const type = await createTestType('test-type-state');
      const grantApiRepository = testDataSource.getRepository(GrantAPI);

      const grant = grantApiRepository.create({
        type,
        baseURL: 'https://api.example.com',
        secret: 'test-secret',
        account: 'test-account',
        name: 'test-grant-state',
        state: 'inactive',
      });

      const savedGrant = await grantApiRepository.save(grant);

      expect(savedGrant.state).toBe('inactive');
    });
  });
});
