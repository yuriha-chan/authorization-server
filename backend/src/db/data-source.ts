// src/db/data-source.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AgentContainer } from '../entities/AgentContainer';
import { GrantAPI } from '../entities/GrantAPI';
import { NotificationAPI } from '../entities/NotificationAPI';
import { Authorization } from '../entities/Authorization';
import { AuthorizationRequest } from '../entities/AuthorizationRequest';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './data/auth.db',
  synchronize: true, // 開発時のみ。本番ではマイグレーション推奨
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    AgentContainer,
    GrantAPI,
    NotificationAPI,
    Authorization,
    AuthorizationRequest,
  ],
});
