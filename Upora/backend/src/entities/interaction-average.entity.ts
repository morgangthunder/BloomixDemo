import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('interaction_averages')
@Index(['interactionTypeId', 'lessonId', 'substageId', 'tenantId'], { unique: true })
export class InteractionAverage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // What this average is for
  @Column({ name: 'interaction_type_id', type: 'varchar', length: 100 })
  interactionTypeId: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @Column({ name: 'substage_id', type: 'varchar', length: 100 })
  substageId: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string; // NULL for public/cross-tenant averages

  // Aggregated Metrics
  @Column({ name: 'total_attempts', type: 'integer', default: 0 })
  totalAttempts: number;

  @Column({ name: 'avg_score', type: 'decimal', precision: 5, scale: 2 })
  avgScore: number; // 0.00 - 100.00

  @Column({ name: 'avg_time_seconds', type: 'integer', nullable: true })
  avgTimeSeconds?: number;

  // Custom Metrics (Interaction-Specific)
  @Column({ name: 'aggregate_data', type: 'jsonb', nullable: true })
  aggregateData?: any;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

