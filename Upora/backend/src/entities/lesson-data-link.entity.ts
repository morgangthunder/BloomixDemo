import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Lesson } from './lesson.entity';
import { ContentSource } from './content-source.entity';

@Entity('lesson_data_links')
export class LessonDataLink {
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

  @Column({ name: 'relevance_score', type: 'decimal', precision: 3, scale: 2, nullable: true })
  relevanceScore: number;

  @Column({ name: 'use_in_context', type: 'boolean', default: true })
  useInContext: boolean;

  @CreateDateColumn({ name: 'linked_at' })
  linkedAt: Date;
}

