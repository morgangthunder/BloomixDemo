import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Generated Image Entity
 * 
 * Stores metadata about images generated for lessons and interactions.
 * Images are stored in MinIO/S3, this entity tracks:
 * - Which lesson/interaction the image belongs to
 * - Cache key (param_hash) for deduplication
 * - Personalisation tags used during generation
 * - Component map (labels + coordinates) for interactive use
 * - Dictionary labels for simple-word image reuse
 */
@Entity('generated_images')
@Index(['lessonId'])
@Index(['accountId'])
@Index(['lessonId', 'accountId'])
@Index(['paramHash'])
export class GeneratedImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @Column({ type: 'text', name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'varchar', length: 50, name: 'mime_type', default: 'image/png' })
  mimeType: string;

  @Column({ type: 'int', name: 'width', nullable: true })
  width: number | null;

  @Column({ type: 'int', name: 'height', nullable: true })
  height: number | null;

  @Column({ type: 'text', name: 'prompt', nullable: true })
  prompt: string | null;

  @Column({ type: 'uuid', name: 'substage_id', nullable: true })
  substageId: string | null;

  @Column({ type: 'uuid', name: 'interaction_id', nullable: true })
  interactionId: string | null;

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata: Record<string, any> | null;

  /** SHA-256 hash of normalised generation parameters for cache lookup */
  @Column({ type: 'varchar', length: 64, name: 'param_hash', nullable: true })
  paramHash: string | null;

  /** Personalisation tags active when this image was generated (sorted) */
  @Column({ type: 'text', array: true, name: 'personalisation_tags', nullable: true })
  personalisationTags: string[] | null;

  /**
   * Component map: labelled regions / objects within the image.
   * Format: { components: [{ label, x, y, width, height, confidence? }] }
   * Populated by a follow-up LLM call when includeComponentMap is requested.
   */
  @Column({ type: 'jsonb', name: 'component_map', nullable: true })
  componentMap: Record<string, any> | null;

  /** Simple-word dictionary labels for cross-interaction reuse (e.g. ["cat", "tree"]) */
  @Column({ type: 'text', array: true, name: 'dictionary_labels', nullable: true })
  dictionaryLabels: string[] | null;

  /** Links desktop ↔ mobile variant as a pair for dual-viewport caching */
  @Column({ type: 'uuid', name: 'paired_image_id', nullable: true })
  pairedImageId: string | null;

  /** The userInput / interest tag used to generate this image (e.g. "Breaking Bad") */
  @Column({ type: 'varchar', length: 255, name: 'user_input', nullable: true })
  userInput: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

