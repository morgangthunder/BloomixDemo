import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('student_topic_scores')
@Index(['userId', 'lessonId', 'topic'], { unique: true }) // One score per student per topic per lesson
export class StudentTopicScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'user_id' })
  @Index()
  userId: string;

  @Column('varchar', { name: 'lesson_id' })
  @Index()
  lessonId: string;

  @Column('varchar')
  topic: string; // e.g., "Photosynthesis", "Chemical Energy"

  @Column('integer', { name: 'score_percentage', default: 0 })
  scorePercentage: number; // 0-100

  @Column('integer', { name: 'attempts_count', default: 0 })
  attemptsCount: number;

  @Column('integer', { name: 'correct_count', default: 0 })
  correctCount: number;

  @Column('integer', { name: 'incorrect_count', default: 0 })
  incorrectCount: number;

  @Column('timestamp', { name: 'last_attempted_at', nullable: true })
  lastAttemptedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

