import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('interaction_results')
@Index(['studentId', 'lessonId'])
@Index(['interactionTypeId', 'lessonId', 'tenantId'])
export class InteractionResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Context
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

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

  // Core Metrics
  @Column({ type: 'integer' })
  score: number; // 0-100

  @Column({ name: 'time_taken_seconds', type: 'integer', nullable: true })
  timeTakenSeconds?: number;

  @Column({ type: 'integer', default: 1 })
  attempts: number;

  // Interaction-Specific Data
  @Column({ name: 'result_data', type: 'jsonb' })
  resultData: any;

  // Timestamps
  @Column({ name: 'completed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

