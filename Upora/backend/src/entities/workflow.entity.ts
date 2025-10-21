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

@Entity('interaction_workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  interactionTypeId: string;

  @Column({ type: 'jsonb' })
  workflowJson: any; // n8n workflow definition

  @Column({ type: 'jsonb', nullable: true })
  inputFormat: any; // Expected input schema

  @Column({ type: 'jsonb', nullable: true })
  outputFormat: any; // Expected output schema

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

  @Column({ type: 'int', default: 0 })
  executionCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
