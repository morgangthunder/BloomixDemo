import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_prompts')
export class AiPrompt {
  @PrimaryColumn('varchar')
  id: string; // e.g., 'auto-populator.textAutoPopulate', 'scaffolder.buildLesson'

  @Column('varchar', { name: 'assistant_id' })
  assistantId: string; // e.g., 'auto-populator', 'scaffolder'

  @Column('varchar', { name: 'prompt_key' })
  promptKey: string; // e.g., 'textAutoPopulate', 'buildLesson'

  @Column('varchar', { length: 200 })
  label: string; // Display name

  @Column('text')
  content: string; // The actual prompt text

  @Column('varchar', { name: 'default_content', length: 5000, nullable: true })
  defaultContent: string; // Fallback if user deletes content

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

