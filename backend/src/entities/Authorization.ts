// src/entities/Authorization.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AgentContainer } from './AgentContainer';
import { GrantAPI } from './GrantAPI';

@Entity('authorizations')
export class Authorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string; // 公開鍵のフィンガープリント

  @ManyToOne(() => GrantAPI, { eager: true, nullable: false })
  grantApi: GrantAPI;

  @Column({ type: 'json' })
  realm: {
    repository: string;
    read: number;
    write: number;
  };

  @Column({ nullable: true })
  revokeTime: Date;

  @Column({ default: 'active' })
  state: string;

  @Column({ nullable: true })
  token: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => AgentContainer, container => container.authorizations)
  container: AgentContainer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
