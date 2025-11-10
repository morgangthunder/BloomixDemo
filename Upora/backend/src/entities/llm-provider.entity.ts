import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('llm_providers')
export class LlmProvider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar')
  name: string; // "xAI Grok Beta", "GPT-4 Turbo", "Claude 3.5 Sonnet"

  @Column('varchar', { name: 'provider_type' })
  providerType: string; // "xai", "openai", "anthropic", "google"

  @Column('varchar', { name: 'api_endpoint' })
  apiEndpoint: string;

  @Column('varchar', { name: 'api_key' })
  apiKey: string; // TODO: Encrypt in production

  @Column('varchar', { name: 'model_name' })
  modelName: string; // "grok-beta", "gpt-4-turbo", "claude-3-5-sonnet"

  @Column('decimal', { precision: 10, scale: 2, name: 'cost_per_million_tokens' })
  costPerMillionTokens: number;

  @Column('integer', { name: 'max_tokens', default: 4096 })
  maxTokens: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('boolean', { name: 'is_default', default: false })
  isDefault: boolean; // Currently selected provider

  @Column('jsonb', { nullable: true })
  config: any; // Provider-specific settings

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

