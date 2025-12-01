import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_interaction_progress')
@Index(['userId', 'lessonId'])
@Index(['interactionTypeId', 'lessonId', 'substageId'])
@Index(['userId', 'lessonId', 'stageId', 'substageId', 'interactionTypeId'], { unique: true })
export class UserInteractionProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Context
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @Column({ name: 'stage_id', type: 'varchar', length: 100 })
  stageId: string;

  @Column({ name: 'substage_id', type: 'varchar', length: 100 })
  substageId: string;

  @Column({ name: 'interaction_type_id', type: 'varchar', length: 100 })
  interactionTypeId: string;

  // Required Fields (always present)
  @Column({ name: 'start_timestamp', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startTimestamp: Date;

  @Column({ name: 'complete_timestamp', type: 'timestamp', nullable: true })
  completeTimestamp?: Date;

  @Column({ type: 'integer', default: 1 })
  attempts: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  // Optional Standard Fields (encouraged structure)
  @Column({ type: 'integer', nullable: true })
  score?: number; // 0-100

  @Column({ name: 'time_taken_seconds', type: 'integer', nullable: true })
  timeTakenSeconds?: number;

  @Column({ name: 'interaction_events', type: 'jsonb', nullable: true })
  interactionEvents?: Array<{
    type: string;
    timestamp: Date;
    data: Record<string, any>;
  }>;

  // Builder-Defined Custom Fields (flexible JSONB)
  @Column({ name: 'custom_data', type: 'jsonb', nullable: true })
  customData?: Record<string, any>;

  // Metadata
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

