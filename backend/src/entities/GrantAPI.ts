// src/entities/GrantAPI.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GrantApiType } from './GrantApiType';

@Entity('grant_apis')
export class GrantAPI {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GrantApiType, { eager: true })
  @JoinColumn({ name: 'type', referencedColumnName: 'name' })
  type: GrantApiType;

  @Column()
  baseURL: string;

  @Column()
  secret: string;

  @Column()
  account: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 86400000 }) // 24 hours in ms
  defaultRevokeTime: number;

  @Column({ default: 'active' })
  state: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
