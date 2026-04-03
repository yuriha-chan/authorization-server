// src/entities/AgentContainer.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Authorization } from './Authorization';

@Entity('agent_containers')
export class AgentContainer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  uniqueName: string;

  @Column()
  fingerprint: string;

  @Column({ type: 'text' })
  publicKey: string;

  @Column({ default: 'active' })
  state: string; // active, revoked

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Authorization, auth => auth.container)
  authorizations: Authorization[];
}
