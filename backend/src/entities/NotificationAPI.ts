// src/entities/NotificationAPI.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notification_apis')
export class NotificationAPI {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'discord', 'slack', 'webhook'

  @Column()
  baseURL: string;

  @Column()
  secret: string;

  @Column()
  account: string;

  @Column()
  name: string;

  @Column()
  channel: string;

  @Column({ default: 'active' })
  state: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
