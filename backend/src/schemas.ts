import { z } from 'zod';

export const registerSchema = z.object({
  uniqueName: z.string().min(3).max(100),
  publicKey: z.string().min(1),
});

export const requestSchema = z.object({
  codeAccessPublicKey: z.string().min(1),
  realm: z.object({
    repository: z.string().min(1),
    read: z.number().int().min(0).max(1),
    write: z.number().int().min(0).max(1),
    baseUrl: z.string().url()
  }),
  type: z.string().default('github')
});

export const grantSchema = z.object({
  type: z.string().min(1),
  baseURL: z.string().url(),
  secret: z.string().min(1),
  account: z.string().min(1),
  name: z.string().min(1),
  defaultRevokeTime: z.number().optional(),
});

export const notificationSchema = z.object({
  type: z.string().min(1),
  baseURL: z.string().url(),
  secret: z.string().min(1),
  account: z.string().min(1),
  name: z.string().min(1),
  channel: z.string().min(1),
});

export const approveRequestSchema = z.object({
  revokeTime: z.number().optional(),
});

export const grantApiTypeSchema = z.object({
  name: z.string().min(1).max(100),
  grantCode: z.string().min(1),
  revokeCode: z.string().min(1),
  getStatusCode: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RequestInput = z.infer<typeof requestSchema>;
export type GrantInput = z.infer<typeof grantSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type ApproveRequestInput = z.infer<typeof approveRequestSchema>;
export type GrantApiTypeInput = z.infer<typeof grantApiTypeSchema>;