import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Processed Content Cache
 *
 * Caches LLM-processed content outputs by parameter hash so identical
 * requests (same source + processing parameters + personalisation) return
 * the previously computed result without another LLM call.
 */
@Entity('processed_content_cache')
@Index(['tenantId', 'contentType', 'paramHash'], { unique: true })
@Index(['paramHash'])
export class ProcessedContentCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  /** Discriminator: 'summary', 'qa_pairs', 'facts', 'chunks', 'concepts', etc. */
  @Column({ type: 'varchar', length: 50, name: 'content_type' })
  contentType: string;

  /** SHA-256 of normalised input parameters */
  @Column({ type: 'varchar', length: 64, name: 'param_hash' })
  paramHash: string;

  /** Optional FK to the original content source */
  @Column({ type: 'uuid', name: 'source_content_id', nullable: true })
  sourceContentId: string | null;

  /** Optional FK to the lesson this cache entry relates to */
  @Column({ type: 'uuid', name: 'lesson_id', nullable: true })
  lessonId: string | null;

  /** FK to the ProcessedContentOutput row that holds the actual data */
  @Column({ type: 'uuid', name: 'output_reference_id', nullable: true })
  outputReferenceId: string | null;

  /** Type of the referenced output (mirrors ProcessedContentOutput.outputType) */
  @Column({ type: 'varchar', length: 50, name: 'output_type', nullable: true })
  outputType: string | null;

  /** Personalisation tags active at generation time (sorted) */
  @Column({ type: 'text', array: true, name: 'personalisation_tags', nullable: true })
  personalisationTags: string[] | null;

  /** Inline cached data — for lightweight outputs stored directly instead of via reference */
  @Column({ type: 'jsonb', name: 'cached_data', nullable: true })
  cachedData: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
