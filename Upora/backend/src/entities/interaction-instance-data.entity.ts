import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('interaction_instance_data')
@Index(['interactionTypeId', 'lessonId', 'substageId'])
@Index(['createdAt'])
export class InteractionInstanceData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Context (identifies the interaction instance)
  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @Column({ name: 'stage_id', type: 'varchar', length: 100 })
  stageId: string;

  @Column({ name: 'substage_id', type: 'varchar', length: 100 })
  substageId: string;

  @Column({ name: 'interaction_type_id', type: 'varchar', length: 100 })
  interactionTypeId: string;

  @Column({ name: 'processed_content_id', type: 'uuid', nullable: true })
  processedContentId?: string;

  // Instance Data (builder-defined schema, stored as JSONB)
  @Column({ name: 'instance_data', type: 'jsonb' })
  instanceData: Record<string, any>;

  // Metadata
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

