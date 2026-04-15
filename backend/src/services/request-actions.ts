// src/services/request-actions.ts
import { AppDataSource } from '../db/data-source';
import { AuthorizationRequest } from '../entities/AuthorizationRequest';
import { Authorization } from '../entities/Authorization';
import { GrantAPI } from '../entities/GrantAPI';
import { eventBus } from '../events/pubsub';
import { executeGrantCode, findGrantForType } from './operation-executor';

export async function approveRequest(requestId: string, source: string = 'api'): Promise<{ success: boolean; error?: string }> {
  const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
  const request = await requestRepo.findOne({
    where: { id: requestId, state: 'pending' },
    relations: ['authorization', 'authorization.container']
  });

  if (!request) {
    return { success: false, error: 'Pending request not found' };
  }

  const auth = request.authorization;
  const grantApiId = auth.grantApi?.id || (auth as any).grantApiId;
  if (!grantApiId) {
    return { success: false, error: 'Authorization has no associated Grant API' };
  }

  const grantApi = await AppDataSource.getRepository(GrantAPI).findOne({
    where: { id: grantApiId },
    relations: ['type']
  });

  const grantApiTypeName = grantApi?.type?.name;
  if (!grantApiTypeName) {
    return { success: false, error: 'Grant API type not found' };
  }

  let parsedSecret: Record<string, any>;
  try {
    parsedSecret = JSON.parse(grantApi.secret);
  } catch {
    parsedSecret = { token: grantApi.secret };
  }

  try {
    const grantResult = await executeGrantCode({
      id: auth.id,
      realm: auth.realm,
      key: auth.key,
      grantApi: {
        name: grantApiTypeName,
        baseURL: grantApi.baseURL,
        secret: parsedSecret.token || parsedSecret
      }
    });

    request.state = 'approved';
    const historyEntry: any = { action: 'approved', timestamp: new Date(), source };
    if (source === 'api') {
      (historyEntry as any).admin = 'api';
    }
    request.history = [...(request.history || []), historyEntry];

    auth.state = 'active';
    auth.token = (grantResult.data as any)?.token || '';
    auth.metadata = grantResult.data;

    await AppDataSource.transaction(async (manager) => {
      await manager.save(request);
      await manager.save(auth);
    });

    await eventBus.publish('request:approved', {
      requestId: request.id,
      authorizationId: auth.id,
      agentUniqueName: auth.container?.uniqueName,
      fingerprint: auth.container?.fingerprint,
      realm: auth.realm,
      admin: source,
      grantResult: { token: (grantResult.data as any)?.token, executed: true }
    });

    return { success: true };
  } catch (execError: any) {
    auth.state = 'failed';
    auth.metadata = { 
      error: 'Grant code execution failed',
      errorMessage: execError.message,
      failedAt: new Date().toISOString()
    };
    
    const historyEntry: any = { 
      action: 'failed', 
      timestamp: new Date(), 
      error: execError.message 
    };
    request.history = [...(request.history || []), historyEntry];
    
    await AppDataSource.transaction(async (manager) => {
      await manager.save(request);
      await manager.save(auth);
    });

    return { success: false, error: execError.message };
  }
}

export async function denyRequest(requestId: string, source: string = 'api'): Promise<{ success: boolean; error?: string }> {
  const requestRepo = AppDataSource.getRepository(AuthorizationRequest);
  const request = await requestRepo.findOne({
    where: { id: requestId, state: 'pending' },
    relations: ['authorization', 'authorization.container']
  });

  if (!request) {
    return { success: false, error: 'Pending request not found' };
  }

  request.state = 'denied';
  const historyEntry: any = { action: 'denied', timestamp: new Date(), source };
  if (source === 'api') {
    (historyEntry as any).admin = 'api';
  }
  request.history = [...(request.history || []), historyEntry];
  await requestRepo.save(request);

  await eventBus.publish('request:denied', {
    requestId: request.id,
    agentUniqueName: request.authorization?.container?.uniqueName,
    fingerprint: request.authorization?.container?.fingerprint,
    realm: request.authorization?.realm,
    admin: source
  });

  return { success: true };
}
