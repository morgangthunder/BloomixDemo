import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApprovalStatus } from '../common/enums/approval-status.enum';
import { Stage, ContentSourceReference, MediaAssetReference, ScriptBlock } from '../services/lesson-data.service';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  difficulty: string;

  @Column({ type: 'int', nullable: true, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true, array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'jsonb' })
  data: {
    // Lesson Metadata
    metadata: {
      version: string;
      created: string;
      updated: string;
      lessonId: string;
      tenantId: string;
      createdBy: string;
    };
    
    // Lesson Configuration
    config: {
      title: string;
      description: string;
      category: string;
      difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
      durationMinutes: number;
      thumbnailUrl?: string;
      tags: string[];
      status: 'draft' | 'pending' | 'approved' | 'rejected';
    };
    
    // AI Context & Prompts
    aiContext: {
      generalPrompt: string;
      defaultSubStagePrompts: { [key: string]: string };
      customPrompts: { [key: string]: string };
      contextData: {
        lessonObjectives: string[];
        prerequisites: string[];
        keyConcepts: string[];
      };
    };
    
    // Lesson Structure (TEACH Methodology)
    structure: {
      stages: Stage[];
      totalDuration: number;
      learningObjectives: string[];
    };
    
    // Content Library References
    contentReferences: {
      contentSources: ContentSourceReference[];
      mediaAssets: MediaAssetReference[];
    };
    
    // Processed Content (Embedded JSON Data)
    processedContent: {
      [contentId: string]: any;
    };
    
    // Interaction Configuration
    interactions: {
      interactionTypes: any[];
      customInteractions: any[];
    };
    
    // Script & Timing
    script: {
      blocks: ScriptBlock[];
      totalDuration: number;
      timing: any;
    };
    
    // Assessment & Progress
    assessment: {
      checkpoints: any[];
      evaluationCriteria: any[];
      progressTracking: any;
    };
  };

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  views: number;

  @Column({ type: 'int', default: 0, name: 'completion_count' })
  completions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'rating_average' })
  completionRate: number;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, course => course.lessons, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
