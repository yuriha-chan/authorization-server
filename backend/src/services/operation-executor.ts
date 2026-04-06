// src/services/operation-executor.ts
import { GrantApiType } from '../entities/GrantApiType';
import { GrantAPI } from '../entities/GrantAPI';
import { AppDataSource } from '../db/data-source';

interface GrantResult {
  token?: string;
  expires?: number;
  [key: string]: any;
}

interface RevokeResult {
  revoked: boolean;
  [key: string]: any;
}

interface StatusResult {
  active: boolean;
  [key: string]: any;
}

export async function executeGrantCode(
  auth: { id: string; realm: { repository: string; read: number; write: number }; grantApi: { baseUrl: string; name: string } },
  key: string,
  secret: string
): Promise<{ data: any; autoExpiry: boolean }> {
  const typeRepo = AppDataSource.getRepository(GrantApiType);
  const grantType = await typeRepo.findOneBy({ name: auth.grantApi.name });
  
  if (!grantType) {
    throw new Error(`Grant API type '${auth.grantApi.name}' not found`);
  }

  const sandbox = {
    auth,
    key,
    secret,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Buffer,
    JSON,
    Date,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Map,
    Set,
    fetch: global.fetch,
  };

  const fn = new Function(...Object.keys(sandbox), `
    "use strict";
    ${grantType.grantCode}
    return grant(auth, key, secret);
  `);

  return await fn(...Object.values(sandbox));
}

export async function executeRevokeCode(
  auth: { id: string; realm: { repository: string; read: number; write: number }; grantApi: { baseUrl: string; name: string } },
  key: string,
  secret: string,
  data: any
): Promise<{ revoked: boolean }> {
  const typeRepo = AppDataSource.getRepository(GrantApiType);
  const grantType = await typeRepo.findOneBy({ name: auth.grantApi.name });
  
  if (!grantType) {
    throw new Error(`Grant API type '${auth.grantApi.name}' not found`);
  }

  const sandbox = {
    auth,
    key,
    secret,
    data,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Buffer,
    JSON,
    Date,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Map,
    Set,
    fetch: global.fetch,
  };

  const fn = new Function(...Object.keys(sandbox), `
    "use strict";
    ${grantType.revokeCode}
    return revoke(auth, key, secret, data);
  `);

  return await fn(...Object.values(sandbox));
}

export async function executeGetStatusCode(
  auth: { id: string; realm: { repository: string; read: number; write: number }; grantApi: { baseUrl: string; name: string } },
  key: string,
  secret: string,
  data: any
): Promise<{ status: string }> {
  const typeRepo = AppDataSource.getRepository(GrantApiType);
  const grantType = await typeRepo.findOneBy({ name: auth.grantApi.name });
  
  if (!grantType) {
    throw new Error(`Grant API type '${auth.grantApi.name}' not found`);
  }

  const sandbox = {
    auth,
    key,
    secret,
    data,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Buffer,
    JSON,
    Date,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Error,
    RegExp,
    Map,
    Set,
    fetch: global.fetch,
  };

  const fn = new Function(...Object.keys(sandbox), `
    "use strict";
    ${grantType.getStatusCode}
    return getStatus(auth, key, secret, data);
  `);

  return await fn(...Object.values(sandbox));
}

export async function findGrantForType(typeName: string): Promise<GrantAPI | null> {
  const grantRepo = AppDataSource.getRepository(GrantAPI);
  
  // Find an active grant for this type
  // Since type is now a relationship, we need to join and filter
  const grant = await grantRepo.findOne({
    where: { state: 'active' },
    relations: ['type'],
  });
  
  if (grant && grant.type?.name === typeName) {
    return grant;
  }
  
  // Try to find any grant with matching type name
  const grants = await grantRepo.find({
    where: { state: 'active' },
    relations: ['type'],
  });
  
  return grants.find(g => g.type?.name === typeName) || null;
}
