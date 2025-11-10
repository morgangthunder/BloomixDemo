import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('student_mistakes')
@Index(['userId', 'lessonId', 'topic'])
export class StudentMistake {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'user_id' })
  @Index()
  userId: string;

  @Column('varchar', { name: 'lesson_id' })
  @Index()
  lessonId: string;

  @Column('varchar')
  topic: string;

  @Column('text')
  question: string; // The question they got wrong

  @Column('text', { name: 'incorrect_answer' })
  incorrectAnswer: string; // What they answered

  @Column('text', { name: 'correct_answer' })
  correctAnswer: string; // What the correct answer was

  @Column('integer', { name: 'repeat_count', default: 1 })
  repeatCount: number; // How many times they've made this same mistake

  @Column('text', { nullable: true })
  tip: string; // AI-generated tip for this mistake

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column('timestamp', { name: 'last_occurred_at' })
  lastOccurredAt: Date;
}

