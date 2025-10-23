import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { ContentSource } from './content-source.entity';

@Entity('processed_content_outputs')
export class ProcessedContentOutput {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'content_source_id', type: 'uuid', nullable: true })
  contentSourceId: string | null;

  @ManyToOne(() => ContentSource, { nullable: true })
  @JoinColumn({ name: 'content_source_id' })
  contentSource: ContentSource;

  @Column({ name: 'workflow_id', type: 'uuid', nullable: true })
  workflowId: string | null;

  @Column({ name: 'output_name', length: 255 })
  outputName: string;

  @Column({ name: 'output_type', length: 50 })
  outputType: string; // 'qa_pairs', 'summary', 'facts', 'chunks', 'concepts', etc.

  @Column({ name: 'output_data', type: 'jsonb' })
  outputData: any; // The actual processed data (JSON)

  @Column({ name: 'workflow_name', type: 'varchar', length: 255, nullable: true })
  workflowName: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

