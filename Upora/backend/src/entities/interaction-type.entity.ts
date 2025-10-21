import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApprovalStatus } from '../common/enums/approval-status.enum';
import { User } from './user.entity';

@Entity('interaction_types')
export class InteractionType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  stage: string; // e.g., 'Trigger', 'Explore', etc.

  @Column()
  subStage: string; // e.g., 'Tease', 'Ignite', etc.

  @Column({ type: 'jsonb' })
  config: {
    inputs?: any[];
    events?: any[];
    rendering?: any;
    pixiCode?: string;
  };

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
