import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ContentSource } from './content-source.entity';
import { User } from './user.entity';
import { LlmProvider } from './llm-provider.entity';

@Entity('llm_generation_logs')
export class LlmGenerationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'content_source_id', nullable: true })
  contentSourceId: string | null;

  @ManyToOne(() => ContentSource, { nullable: true })
  @JoinColumn({ name: 'content_source_id' })
  contentSource: ContentSource;

  @Column('varchar', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('varchar', { name: 'use_case' })
  useCase: string; // 'content-analysis' | 'ai-tutor' | 'interaction-generation' | 'lesson-scaffolding' | 'image-generation'

  @Column('text', { name: 'prompt_text' })
  promptText: string;

  @Column('jsonb', { nullable: true })
  response: any;

  @Column('integer', { name: 'tokens_used' })
  tokensUsed: number;

  @Column('integer', { name: 'processing_time_ms', nullable: true })
  processingTimeMs: number;

  @Column('integer', { name: 'outputs_generated', default: 0 })
  outputsGenerated: number;

  @Column('integer', { name: 'outputs_approved', default: 0 })
  outputsApproved: number;

  @Column('varchar', { name: 'provider_id', nullable: true })
  providerId: string;

  @ManyToOne(() => LlmProvider, { nullable: true })
  @JoinColumn({ name: 'provider_id' })
  provider: LlmProvider;

  @Column('varchar', { name: 'tenant_id' })
  tenantId: string;

  @Column('varchar', { name: 'assistant_id', nullable: true })
  assistantId: string | null; // 'inventor' | 'ai-teacher' | 'auto-populator' | 'content-analyzer' | etc.

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

