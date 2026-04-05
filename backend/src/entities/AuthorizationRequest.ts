// src/entities/AuthorizationRequest.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Authorization } from './Authorization';

@Entity('authorization_requests')
export class AuthorizationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  state: string; // pending, approved, denied

  @Column({ type: 'text', nullable: true })
  signature: string; // リクエストの署名

  @Column({ type: 'json', nullable: true })
  history: Array<{ action: string; timestamp: Date; admin?: string }>;

  @Column({ type: 'varchar', nullable: true })
  authorizationId: string;

  @ManyToOne(() => Authorization, { cascade: true })
  @JoinColumn({ name: 'authorizationId' })
  authorization: Authorization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
