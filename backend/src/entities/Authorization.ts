// src/entities/Authorization.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AgentContainer } from './AgentContainer';

@Entity('authorizations')
export class Authorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string; // 公開鍵のフィンガープリント

  @Column()
  type: string; // 'github'

  @Column({ type: 'json' })
  realm: {
    repository: string;
    read: number;
    write: number;
    baseUrl: string;
  };

  @Column({ nullable: true })
  revokeTime: Date;

  @Column({ default: 'active' })
  state: string;

  @ManyToOne(() => AgentContainer, container => container.authorizations)
  container: AgentContainer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
