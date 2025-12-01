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

  @Column('text', { name: 'generation_prompt' })
  generationPrompt: string; // LLM prompt for auto-generation

  @Column('varchar', { name: 'pixi_renderer', nullable: true })
  pixiRenderer: string; // Component name (e.g., 'FragmentBuilderComponent')

  @Column('varchar', { name: 'interaction_type_category', nullable: true })
  interactionTypeCategory: string; // 'html' | 'pixijs' | 'iframe'

  @Column('text', { name: 'html_code', nullable: true })
  htmlCode: string; // HTML code for HTML interactions

  @Column('text', { name: 'css_code', nullable: true })
  cssCode: string; // CSS code for HTML interactions

  @Column('text', { name: 'js_code', nullable: true })
  jsCode: string; // JavaScript/TypeScript code for HTML/PixiJS interactions

  @Column('varchar', { name: 'iframe_url', nullable: true })
  iframeUrl: string; // URL for iFrame interactions

  @Column('jsonb', { name: 'iframe_config', nullable: true })
  iframeConfig: any; // Config for iFrame (width, height, permissions, screenshotTriggers)

  @Column('varchar', { name: 'iframe_document_url', nullable: true })
  iframeDocumentUrl: string; // URL to uploaded document for iframe interactions

  @Column('varchar', { name: 'iframe_document_file_name', nullable: true })
  iframeDocumentFileName: string; // Original filename of uploaded document

  @Column('jsonb', { name: 'config_schema', nullable: true })
  configSchema: any; // Schema defining what lesson-builders can configure

  @Column('jsonb', { name: 'sample_data', nullable: true })
  sampleData: any; // Sample data for testing/preview

  @Column('decimal', { name: 'min_confidence', precision: 3, scale: 2, default: 0.7 })
  minConfidence: number; // Minimum confidence threshold for auto-generation

  @Column('simple-array', { name: 'teach_stage_fit', nullable: true })
  teachStageFit: string[]; // Recommended stages, e.g., ['absorb-show', 'tease-trigger']

  @Column('simple-array', { name: 'requires_resources', nullable: true })
  requiresResources: string[]; // e.g., ['image', 'video', 'audio']

  @Column('varchar', { name: 'cognitive_load', default: 'medium' })
  cognitiveLoad: string; // low | medium | high

  @Column('integer', { name: 'estimated_duration', nullable: true })
  estimatedDuration: number; // In seconds

  @Column('jsonb', { name: 'asset_requirements', nullable: true })
  assetRequirements: any; // Required sprites, sounds, textures

  @Column('jsonb', { name: 'mobile_adaptations', nullable: true })
  mobileAdaptations: any; // Mobile-specific UX modifications

  @Column('text', { name: 'scoring_logic', nullable: true })
  scoringLogic: string; // How 0-100 score is calculated

  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean; // Can be disabled without deletion

  @Column('text', { name: 'ai_prompt_template', nullable: true })
  aiPromptTemplate: string; // Builder-defined prompt additions for AI Teacher

  @Column('jsonb', { name: 'ai_event_handlers', nullable: true })
  aiEventHandlers: {
    [eventType: string]: {
      triggerLLM: boolean;
      customPrompt?: string;
      responseFormat?: 'text' | 'structured' | 'action';
    };
  } | null; // Event handling configuration

  @Column('jsonb', { name: 'ai_response_actions', nullable: true })
  aiResponseActions: {
    actionTypes: string[]; // ['highlight', 'show-hint', 'update-ui', etc.]
    defaultFormat: 'text' | 'structured';
  } | null; // Response action configuration

  @Column('jsonb', { name: 'instance_data_schema', nullable: true })
  instanceDataSchema: {
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      description?: string;
    }>;
  } | null; // Schema defining what data to capture per interaction instance (anonymous)

  @Column('jsonb', { name: 'user_progress_schema', nullable: true })
  userProgressSchema: {
    customFields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      description?: string;
    }>;
  } | null; // Schema defining optional custom fields for user progress (beyond required fields)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
