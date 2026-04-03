// src/entities/GrantAPI.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('grant_apis')
export class GrantAPI {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'github', 'gitlab', etc.

  @Column()
  baseURL: string;

  @Column()
  secret: string;

  @Column()
  account: string;

  @Column()
  name: string;

  @Column({ default: 86400000 }) // 24 hours in ms
  defaultRevokeTime: number;

  @Column({ default: 'active' })
  state: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
