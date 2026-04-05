// backend/test/authorization-entity.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DataSource } from 'typeorm';
import { Authorization } from '../src/entities/Authorization';
import { GrantAPI } from '../src/entities/GrantAPI';
import { GrantApiType } from '../src/entities/GrantApiType';
import { AgentContainer } from '../src/entities/AgentContainer';

describe('Authorization Entity - Refactored Structure', () => {
  let testDataSource: DataSource;

  beforeAll(async () => {
    testDataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      synchronize: true,
      logging: false,
      entities: [Authorization, GrantAPI, GrantApiType, AgentContainer],
    });

    await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    const authorizationRepository = testDataSource.getRepository(Authorization);
    const grantApiRepository = testDataSource.getRepository(GrantAPI);
    const grantApiTypeRepository = testDataSource.getRepository(GrantApiType);
    const containerRepository = testDataSource.getRepository(AgentContainer);
    
    await authorizationRepository.clear();
    await grantApiRepository.clear();
    await grantApiTypeRepository.clear();
    await containerRepository.clear();
  });

  async function createTestGrantApiType(name: string): Promise<GrantApiType> {
    const grantApiTypeRepository = testDataSource.getRepository(GrantApiType);
    const type = grantApiTypeRepository.create({
      name,
      grantCode: 'async function grant() { return {}; }',
      revokeCode: 'async function revoke() { return {}; }',
      getStatusCode: 'async function getStatus() { return {}; }',
    });
    return await grantApiTypeRepository.save(type);
  }

  async function createTestGrantAPI(name: string, typeName: string): Promise<GrantAPI> {
    const grantApiRepository = testDataSource.getRepository(GrantAPI);
    const type = await createTestGrantApiType(typeName);
    
    const grant = grantApiRepository.create({
      type,
      baseURL: 'https://api.example.com',
      secret: 'test-secret',
      account: 'test-account',
      name,
    });
    return await grantApiRepository.save(grant);
  }

  async function createTestContainer(): Promise<AgentContainer> {
    const containerRepository = testDataSource.getRepository(AgentContainer);
    const container = containerRepository.create({
      uniqueName: `test-container-${Date.now()}`,
      fingerprint: 'test-fingerprint',
      publicKey: 'test-public-key',
    });
    return await containerRepository.save(container);
  }

  describe('GrantAPI Relationship', () => {
    it('should create Authorization with grantApi relationship instead of type string', async () => {
      const grantApi = await createTestGrantAPI('test-grant-auth', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth.id).toBeDefined();
      expect(savedAuth.grantApi).toBeDefined();
      expect(savedAuth.grantApi.id).toBe(grantApi.id);
    });

    it('should access grantApi.type.name for backward compatibility', async () => {
      const grantApi = await createTestGrantAPI('test-grant-auth-compat', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);
      
      const fetchedAuth = await authorizationRepository.findOne({
        where: { id: savedAuth.id },
        relations: ['grantApi', 'grantApi.type'],
      });

      expect(fetchedAuth).toBeDefined();
      expect(fetchedAuth!.grantApi.type).toBeDefined();
      expect(fetchedAuth!.grantApi.type.name).toBe('github');
    });

    it('should handle different grantApi types', async () => {
      const githubGrant = await createTestGrantAPI('test-grant-github', 'github');
      const gitlabGrant = await createTestGrantAPI('test-grant-gitlab', 'gitlab');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth1 = authorizationRepository.create({
        key: 'key-1',
        grantApi: githubGrant,
        realm: {
          repository: 'owner/repo1',
          read: 1,
          write: 0,
        },
        container,
      });

      const auth2 = authorizationRepository.create({
        key: 'key-2',
        grantApi: gitlabGrant,
        realm: {
          repository: 'owner/repo2',
          read: 0,
          write: 1,
        },
        container,
      });

      const savedAuth1 = await authorizationRepository.save(auth1);
      const savedAuth2 = await authorizationRepository.save(auth2);

      const fetchedAuth1 = await authorizationRepository.findOne({
        where: { id: savedAuth1.id },
        relations: ['grantApi', 'grantApi.type'],
      });

      const fetchedAuth2 = await authorizationRepository.findOne({
        where: { id: savedAuth2.id },
        relations: ['grantApi', 'grantApi.type'],
      });

      expect(fetchedAuth1!.grantApi.type.name).toBe('github');
      expect(fetchedAuth2!.grantApi.type.name).toBe('gitlab');
    });

    it('should fail when grantApi is not provided', async () => {
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      });

      await expect(authorizationRepository.save(auth)).rejects.toThrow();
    });
  });

  describe('Realm Structure', () => {
    it('should create Authorization with realm containing only repository, read, and write (no baseUrl)', async () => {
      const grantApi = await createTestGrantAPI('test-grant-realm', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth.realm).toBeDefined();
      expect(savedAuth.realm.repository).toBe('owner/repo');
      expect(savedAuth.realm.read).toBe(1);
      expect(savedAuth.realm.write).toBe(0);
      expect(savedAuth.realm.baseUrl).toBeUndefined();
    });

    it('should handle realm with write permissions', async () => {
      const grantApi = await createTestGrantAPI('test-grant-write', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 1,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth.realm.read).toBe(1);
      expect(savedAuth.realm.write).toBe(1);
    });

    it('should handle realm with no permissions', async () => {
      const grantApi = await createTestGrantAPI('test-grant-no-perms', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 0,
          write: 0,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth.realm.read).toBe(0);
      expect(savedAuth.realm.write).toBe(0);
    });

    it('should handle different repository formats', async () => {
      const grantApi = await createTestGrantAPI('test-grant-repos', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const repos = [
        'owner/repo',
        'organization/project',
        'user/my-repo',
        'company/repo-name',
      ];

      for (const repository of repos) {
        const auth = authorizationRepository.create({
          key: `key-${repository.replace(/\//g, '-')}`,
          grantApi,
          realm: {
            repository,
            read: 1,
            write: 0,
          },
          container,
        });

        const savedAuth = await authorizationRepository.save(auth);
        expect(savedAuth.realm.repository).toBe(repository);
      }
    });
  });

  describe('Legacy Type Field Removal', () => {
    it('should not have type field (string) anymore', async () => {
      const grantApi = await createTestGrantAPI('test-grant-legacy', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth).not.toHaveProperty('type');
    });

    it('should fail when trying to use legacy type field', async () => {
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const authData: any = {
        key: 'test-key-fingerprint',
        type: 'github',
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      };

      await expect(authorizationRepository.save(authData)).rejects.toThrow();
    });
  });

  describe('Complete Entity Properties', () => {
    it('should have all required properties with grantApi relationship', async () => {
      const grantApi = await createTestGrantAPI('test-grant-full', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
        token: 'test-token',
        state: 'active',
        metadata: { customField: 'customValue' },
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth.id).toBeDefined();
      expect(savedAuth.key).toBe('test-key-fingerprint');
      expect(savedAuth.grantApi).toBeDefined();
      expect(savedAuth.grantApi.id).toBe(grantApi.id);
      expect(savedAuth.realm).toEqual({
        repository: 'owner/repo',
        read: 1,
        write: 0,
      });
      expect(savedAuth.container.id).toBe(container.id);
      expect(savedAuth.token).toBe('test-token');
      expect(savedAuth.state).toBe('active');
      expect(savedAuth.metadata).toEqual({ customField: 'customValue' });
      expect(savedAuth.createdAt).toBeInstanceOf(Date);
      expect(savedAuth.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle optional fields', async () => {
      const grantApi = await createTestGrantAPI('test-grant-optional', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: {
          repository: 'owner/repo',
          read: 1,
          write: 0,
        },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      expect(savedAuth.revokeTime).toBeNull();
      expect(savedAuth.token).toBeNull();
      expect(savedAuth.metadata).toBeNull();
      expect(savedAuth.state).toBe('active');
    });
  });

  describe('Query Capabilities', () => {
    it('should query authorizations by grantApi', async () => {
      const githubGrant = await createTestGrantAPI('test-grant-query-gh', 'github');
      const gitlabGrant = await createTestGrantAPI('test-grant-query-gl', 'gitlab');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      await authorizationRepository.save(authorizationRepository.create({
        key: 'key-1',
        grantApi: githubGrant,
        realm: { repository: 'owner/repo1', read: 1, write: 0 },
        container,
      }));

      await authorizationRepository.save(authorizationRepository.create({
        key: 'key-2',
        grantApi: githubGrant,
        realm: { repository: 'owner/repo2', read: 1, write: 0 },
        container,
      }));

      await authorizationRepository.save(authorizationRepository.create({
        key: 'key-3',
        grantApi: gitlabGrant,
        realm: { repository: 'owner/repo3', read: 1, write: 0 },
        container,
      }));

      const githubAuths = await authorizationRepository.find({
        where: { grantApi: { id: githubGrant.id } },
        relations: ['grantApi'],
      });

      expect(githubAuths).toHaveLength(2);
      expect(githubAuths.every(a => a.grantApi.id === githubGrant.id)).toBe(true);
    });

    it('should load grantApi with eager type', async () => {
      const grantApi = await createTestGrantAPI('test-grant-eager', 'github');
      const container = await createTestContainer();
      const authorizationRepository = testDataSource.getRepository(Authorization);

      const auth = authorizationRepository.create({
        key: 'test-key-fingerprint',
        grantApi,
        realm: { repository: 'owner/repo', read: 1, write: 0 },
        container,
      });

      const savedAuth = await authorizationRepository.save(auth);

      const fetchedAuth = await authorizationRepository.findOne({
        where: { id: savedAuth.id },
        relations: ['grantApi', 'grantApi.type'],
      });

      expect(fetchedAuth!.grantApi).toBeDefined();
      expect(fetchedAuth!.grantApi.type).toBeDefined();
      expect(fetchedAuth!.grantApi.type.name).toBe('github');
    });
  });
});
