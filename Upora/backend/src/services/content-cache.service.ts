import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { GeneratedImage } from '../entities/generated-image.entity';
import { ProcessedContentCache } from '../entities/processed-content-cache.entity';
import { UserPersonalization } from '../entities/user-personalization.entity';

export interface ImageCacheKey {
  prompt: string;
  userInput?: string;
  customInstructions?: string;
  width?: number;
  height?: number;
  personalisationTags?: string[];
}

export interface ContentCacheKey {
  contentType: string;
  sourceText?: string;
  sourceUrl?: string;
  sourceContentId?: string;
  processingParams?: Record<string, any>;
  personalisationTags?: string[];
}

@Injectable()
export class ContentCacheService {
  private readonly logger = new Logger(ContentCacheService.name);

  constructor(
    @InjectRepository(GeneratedImage)
    private readonly imageRepo: Repository<GeneratedImage>,
    @InjectRepository(ProcessedContentCache)
    private readonly contentCacheRepo: Repository<ProcessedContentCache>,
    @InjectRepository(UserPersonalization)
    private readonly personalizationRepo: Repository<UserPersonalization>,
  ) {}

  // ─── Personalisation Tag Extraction ───────────────────────────

  /**
   * Build a sorted, deterministic array of personalisation tags for a user.
   * Tags are prefixed by category for uniqueness (e.g. "tv:breaking-bad").
   * Returns empty array if user has no personalisation data.
   */
  async getPersonalisationTags(userId: string): Promise<string[]> {
    if (!userId) return [];
    try {
      const prefs = await this.personalizationRepo.findOne({ where: { userId } });
      if (!prefs) return [];

      const tags: string[] = [];
      if (prefs.favouriteTvMovies?.length) {
        prefs.favouriteTvMovies.forEach(t => tags.push(`tv:${this.normalise(t)}`));
      }
      if (prefs.hobbiesInterests?.length) {
        prefs.hobbiesInterests.forEach(h => tags.push(`hobby:${this.normalise(h)}`));
      }
      if (prefs.learningAreas?.length) {
        prefs.learningAreas.forEach(l => tags.push(`learn:${this.normalise(l)}`));
      }
      return tags.sort();
    } catch (err: any) {
      this.logger.warn(`Failed to fetch personalisation for user ${userId}: ${err.message}`);
      return [];
    }
  }

  // ─── Image Cache ──────────────────────────────────────────────

  /**
   * Compute a deterministic SHA-256 hash for image generation parameters.
   * The hash deliberately excludes lessonId/accountId/substageId so that
   * identical prompts + personalisation across different lessons share cache.
   */
  computeImageHash(key: ImageCacheKey): string {
    const canonical = JSON.stringify({
      p: (key.prompt || '').trim().toLowerCase(),
      u: (key.userInput || '').trim().toLowerCase(),
      c: (key.customInstructions || '').trim().toLowerCase(),
      w: key.width || 0,
      h: key.height || 0,
      t: (key.personalisationTags || []).sort(),
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Look up a cached image by param_hash. Returns the most recent match
   * or null if no cache hit.
   */
  async findCachedImage(paramHash: string): Promise<GeneratedImage | null> {
    try {
      const image = await this.imageRepo.findOne({
        where: { paramHash },
        order: { createdAt: 'DESC' },
      });
      if (image) {
        this.logger.log(`[Cache] HIT for image param_hash ${paramHash.substring(0, 12)}… → id ${image.id}`);
      }
      return image;
    } catch (err: any) {
      this.logger.warn(`[Cache] Image lookup error: ${err.message}`);
      return null;
    }
  }

  /**
   * Look up a cached image by dictionary label (simple word).
   * Returns the most recent image tagged with that label.
   */
  async findImageByDictionaryLabel(label: string): Promise<GeneratedImage | null> {
    try {
      const normLabel = this.normalise(label);
      const images = await this.imageRepo
        .createQueryBuilder('img')
        .where(':label = ANY(img.dictionary_labels)', { label: normLabel })
        .orderBy('img.created_at', 'DESC')
        .limit(1)
        .getMany();
      if (images.length > 0) {
        this.logger.log(`[Cache] Dictionary HIT for "${normLabel}" → id ${images[0].id}`);
        return images[0];
      }
      return null;
    } catch (err: any) {
      this.logger.warn(`[Cache] Dictionary lookup error: ${err.message}`);
      return null;
    }
  }

  // ─── Processed Content Cache ──────────────────────────────────

  /**
   * Compute a deterministic SHA-256 hash for content processing parameters.
   */
  computeContentHash(key: ContentCacheKey): string {
    const canonical = JSON.stringify({
      ct: (key.contentType || '').trim().toLowerCase(),
      st: (key.sourceText || '').trim().substring(0, 5000),
      su: (key.sourceUrl || '').trim().toLowerCase(),
      sc: key.sourceContentId || '',
      pp: key.processingParams || {},
      t: (key.personalisationTags || []).sort(),
    });
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Look up cached processed content.
   */
  async findCachedContent(
    tenantId: string,
    contentType: string,
    paramHash: string,
  ): Promise<ProcessedContentCache | null> {
    try {
      const entry = await this.contentCacheRepo.findOne({
        where: { tenantId, contentType, paramHash },
      });
      if (entry) {
        this.logger.log(`[Cache] Content HIT for ${contentType} hash ${paramHash.substring(0, 12)}…`);
      }
      return entry;
    } catch (err: any) {
      this.logger.warn(`[Cache] Content lookup error: ${err.message}`);
      return null;
    }
  }

  /**
   * Store a processed content cache entry.
   */
  async storeContentCache(entry: Partial<ProcessedContentCache>): Promise<ProcessedContentCache | null> {
    try {
      const record = this.contentCacheRepo.create(entry);
      return await this.contentCacheRepo.save(record);
    } catch (err: any) {
      // Unique constraint violation → entry already exists (race condition)
      if (err.code === '23505') {
        this.logger.log(`[Cache] Content entry already exists for hash ${entry.paramHash?.substring(0, 12)}…`);
        return null;
      }
      this.logger.warn(`[Cache] Failed to store content cache: ${err.message}`);
      return null;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────

  /** Normalise a string for consistent hashing and label matching. */
  private normalise(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, '-');
  }
}
