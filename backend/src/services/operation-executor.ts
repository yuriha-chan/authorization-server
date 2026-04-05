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
  typeName: string,
  secrets: Record<string, any>,
  account: string,
  realm: { repository: string; read: number; write: number; baseUrl: string }
): Promise<GrantResult> {
  const typeRepo = AppDataSource.getRepository(GrantApiType);
  const grantType = await typeRepo.findOneBy({ name: typeName });
  
  if (!grantType) {
    throw new Error(`Grant API type '${typeName}' not found`);
  }

  // Create a sandboxed function from the grantCode
  const sandbox = {
    secrets,
    account,
    realm,
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
    return grant(secrets, account, realm);
  `);

  return await fn(...Object.values(sandbox));
}

export async function executeRevokeCode(
  typeName: string,
  secrets: Record<string, any>,
  account: string,
  token: string
): Promise<RevokeResult> {
  const typeRepo = AppDataSource.getRepository(GrantApiType);
  const grantType = await typeRepo.findOneBy({ name: typeName });
  
  if (!grantType) {
    throw new Error(`Grant API type '${typeName}' not found`);
  }

  const sandbox = {
    secrets,
    account,
    token,
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
    return revoke(secrets, account, token);
  `);

  return await fn(...Object.values(sandbox));
}

export async function executeGetStatusCode(
  typeName: string,
  secrets: Record<string, any>,
  account: string,
  token: string
): Promise<StatusResult> {
  const typeRepo = AppDataSource.getRepository(GrantApiType);
  const grantType = await typeRepo.findOneBy({ name: typeName });
  
  if (!grantType) {
    throw new Error(`Grant API type '${typeName}' not found`);
  }

  const sandbox = {
    secrets,
    account,
    token,
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
    return getStatus(secrets, account, token);
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
