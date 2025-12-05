import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('content_sources')
export class ContentSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  type: 'url' | 'pdf' | 'image' | 'api' | 'text' | 'media';

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl: string;

  @Column({ name: 'file_path', type: 'text', nullable: true })
  filePath: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ name: 'full_text', type: 'text', nullable: true })
  fullText: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: 'pending' | 'approved' | 'rejected';

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    fileSize?: number;
    mimeType?: string;
    pageCount?: number;
    topics?: string[];
    keywords?: string[];
    extractedDate?: string;
    [key: string]: any;
  };

  @Column({ name: 'weaviate_id', type: 'uuid', nullable: true })
  weaviateId: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // TODO: Add many-to-many relationship when junction table is created
  // @OneToMany(() => LessonContentSource, lessonContent => lessonContent.contentSource)
  // lessonUsages: LessonContentSource[];
}

