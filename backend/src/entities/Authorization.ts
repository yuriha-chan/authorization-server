// src/entities/Authorization.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { AgentContainer } from './AgentContainer';
import { GrantAPI } from './GrantAPI';

@Entity('authorizations')
export class Authorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string; // 公開鍵のフィンガープリント

  /**
   * The GrantAPI instance this authorization is for.
   * Eager loading ensures grantApi.type.name is available for approval flow.
   */
  @ManyToOne(() => GrantAPI, { eager: true, nullable: false })
  @Index()
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
