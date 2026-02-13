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

@Entity('lesson_engagement_transcriptions')
@Index(['userId'])
@Index(['lessonId'])
export class LessonEngagementTranscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'user_session_id', type: 'uuid', nullable: true })
  userSessionId: string | null;

  /** When set, full transcript is stored in MinIO/S3 at this key; transcript column may be empty */
  @Column({ name: 'storage_key', type: 'varchar', length: 512, nullable: true })
  storageKey: string | null;

  /** Number of transcript entries (for list/dashboard when content is in MinIO) */
  @Column({ name: 'entry_count', type: 'int', default: 0 })
  entryCount: number;

  @Column({ type: 'jsonb', default: [] })
  transcript: Array<{
    timestamp: string;
    speaker: 'user' | 'assistant' | 'system';
    type: string;
    content: string;
    metadata?: Record<string, any>;
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
