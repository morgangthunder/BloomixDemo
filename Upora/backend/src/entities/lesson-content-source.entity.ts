import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Lesson } from './lesson.entity';
import { ContentSource } from './content-source.entity';

/**
 * Junction table linking content sources to lessons (many-to-many)
 * Allows content sources to be reused across multiple lessons
 */
@Entity('lesson_content_sources')
@Unique(['lessonId', 'contentSourceId'])
export class LessonContentSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'content_source_id', type: 'uuid' })
  contentSourceId: string;

  @ManyToOne(() => ContentSource, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_source_id' })
  contentSource: ContentSource;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'added_by', type: 'uuid', nullable: true })
  addedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

