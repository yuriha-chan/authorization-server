// src/entities/GrantApiType.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('grant_api_types')
export class GrantApiType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text' })
  grantCode: string;

  @Column({ type: 'text' })
  revokeCode: string;

  @Column({ type: 'text' })
  getStatusCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
