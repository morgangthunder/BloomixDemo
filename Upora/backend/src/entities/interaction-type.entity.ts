import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('interaction_types')
export class InteractionType {
  @PrimaryColumn('varchar')
  id: string; // e.g., 'fragment-builder'

  @Column('varchar')
  name: string; // e.g., 'True/False Fragment Builder'

  @Column('varchar', { nullable: true })
  category: string; // e.g., 'absorb-show'

  @Column('text')
  description: string;

  @Column('jsonb')
  schema: any; // JSON schema for input validation (Zod-compatible)

  @Column('text')
  generationPrompt: string; // LLM prompt for auto-generation

  @Column('varchar', { nullable: true })
  pixiRenderer: string; // Component name (e.g., 'FragmentBuilderComponent')

  @Column('decimal', { precision: 3, scale: 2, default: 0.7 })
  minConfidence: number; // Minimum confidence threshold for auto-generation

  @Column('simple-array', { nullable: true })
  teachStageFit: string[]; // Recommended stages, e.g., ['absorb-show', 'tease-trigger']

  @Column('simple-array', { nullable: true })
  requiresResources: string[]; // e.g., ['image', 'video', 'audio']

  @Column('varchar', { default: 'medium' })
  cognitiveLoad: string; // low | medium | high

  @Column('integer', { nullable: true })
  estimatedDuration: number; // In seconds

  @Column('jsonb', { nullable: true })
  assetRequirements: any; // Required sprites, sounds, textures

  @Column('jsonb', { nullable: true })
  mobileAdaptations: any; // Mobile-specific UX modifications

  @Column('text', { nullable: true })
  scoringLogic: string; // How 0-100 score is calculated

  @Column('boolean', { default: true })
  isActive: boolean; // Can be disabled without deletion

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
