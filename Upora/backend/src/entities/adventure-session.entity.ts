import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('adventure_sessions')
export class AdventureSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @Column('uuid', { name: 'lesson_id' })
  lessonId: string;

  @Column('jsonb', { name: 'adventure_state', default: '{}' })
  adventureState: {
    currentPhaseId?: string;
    currentInteractionId?: string;
    inventory: Record<string, any>;
    choices: Array<{ phaseId: string; choiceId: string; label: string; timestamp: string }>;
    score: number;
    health: number;
    flags: Record<string, boolean>;
    history: Array<{ phaseId: string; sceneText: string; timestamp: string }>;
  };

  @Column('jsonb', { name: 'scene_cache', default: '{}' })
  sceneCache: Record<string, {
    narrative: string;
    imageUrl?: string;
    imagePrompt?: string;
    choices?: Array<{ id: string; label: string; leadsTo: string }>;
    characters?: Array<{ id: string; expression?: string }>;
    clickableObjects?: Array<{ label: string; action: string; targetInteractionId?: string; characterId?: string; chatOpener?: string; eventType?: string; eventData?: any }>;
    generatedAt: string;
  }>;

  @Column('jsonb', { name: 'character_portraits', default: '{}' })
  characterPortraits: Record<string, {
    neutral?: string;
    happy?: string;
    angry?: string;
    surprised?: string;
    sad?: string;
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
