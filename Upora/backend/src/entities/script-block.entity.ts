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

@Entity('script_blocks')
export class ScriptBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'substage_id', length: 100 })
  substageId: string; // Identifier within the lesson JSON (e.g., "substage-1234567890")

  @Column({ name: 'block_type', length: 50 })
  blockType: string; // 'teacher_talk', 'load_interaction', 'pause'

  @Column({ type: 'text', nullable: true })
  content: string | null; // Text content for teacher_talk

  @Column({ name: 'start_time', type: 'integer' })
  startTime: number; // Seconds from substage start

  @Column({ name: 'end_time', type: 'integer' })
  endTime: number; // Seconds from substage start

  @Column({ type: 'jsonb', nullable: true })
  metadata: any; // Additional data (e.g., {interactionId: 'drag-drop-1'})

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder: number; // Order within the substage

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

