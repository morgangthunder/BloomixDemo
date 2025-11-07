import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentSource } from '../../entities/content-source.entity';
import { LessonDataLink } from '../../entities/lesson-data-link.entity';
import { WeaviateService } from '../../services/weaviate.service';
import { YouTubeService } from '../../services/youtube.service';
import { CreateContentSourceDto } from './dto/create-content-source.dto';
import { UpdateContentSourceDto } from './dto/update-content-source.dto';
import { SearchContentDto } from './dto/search-content.dto';

@Injectable()
export class ContentSourcesService {
  private logger = new Logger('ContentSourcesService');

  constructor(
    @InjectRepository(ContentSource)
    private contentSourcesRepository: Repository<ContentSource>,
    @InjectRepository(LessonDataLink)
    private lessonDataLinksRepository: Repository<LessonDataLink>,
    private weaviateService: WeaviateService,
    private youtubeService: YouTubeService,
  ) {}

  /**
   * Create a new content source
   */
  async create(createDto: CreateContentSourceDto): Promise<ContentSource> {
    const contentSource = this.contentSourcesRepository.create(createDto);
    const saved = await this.contentSourcesRepository.save(contentSource);
    
    this.logger.log(`Created content source: ${saved.id} (${saved.type})`);
    return saved;
  }

  /**
   * Get all content sources (filterable)
   */
  async findAll(tenantId?: string, status?: string): Promise<ContentSource[]> {
    const where: any = {};
    
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    if (status) {
      where.status = status;
    }

    return await this.contentSourcesRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['creator', 'approver'],
    });
  }

  /**
   * Get single content source
   */
  async findOne(id: string, tenantId?: string): Promise<ContentSource> {
    const where: any = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const contentSource = await this.contentSourcesRepository.findOne({
      where,
      relations: ['creator', 'approver'],
    });

    if (!contentSource) {
      throw new NotFoundException(`Content source with ID ${id} not found`);
    }

    return contentSource;
  }

  /**
   * Update content source
   */
  async update(id: string, updateDto: UpdateContentSourceDto, tenantId?: string): Promise<ContentSource> {
    const contentSource = await this.findOne(id, tenantId);
    Object.assign(contentSource, updateDto);
    return await this.contentSourcesRepository.save(contentSource);
  }

  /**
   * Submit content source for approval
   */
  async submit(id: string, tenantId?: string): Promise<ContentSource> {
    const contentSource = await this.findOne(id, tenantId);
    
    if (contentSource.status !== 'pending') {
      throw new Error('Only pending content can be submitted for approval');
    }

    // Status remains pending until admin approves
    this.logger.log(`Content source ${id} submitted for approval`);
    return contentSource;
  }

  /**
   * Approve content source and index in Weaviate
   */
  async approve(id: string, approvedBy: string, tenantId?: string): Promise<ContentSource> {
    const contentSource = await this.findOne(id, tenantId);

    // Update status
    contentSource.status = 'approved';
    contentSource.approvedBy = approvedBy;
    contentSource.approvedAt = new Date();

    const saved = await this.contentSourcesRepository.save(contentSource);

    // Index in Weaviate
    try {
      const weaviateId = await this.weaviateService.indexContent({
        contentSourceId: saved.id,
        tenantId: saved.tenantId,
        summary: saved.summary || '',
        fullText: saved.fullText,
        topics: (saved.metadata?.topics as string[]) || [],
        keywords: (saved.metadata?.keywords as string[]) || [],
        type: saved.type,
        status: saved.status,
        title: saved.title,
        sourceUrl: saved.sourceUrl,
        contentCategory: 'source_content', // Mark as source content
      });

      // Store Weaviate ID
      saved.weaviateId = weaviateId;
      await this.contentSourcesRepository.save(saved);

      this.logger.log(`✅ Content source ${id} approved and indexed in Weaviate`);
    } catch (error) {
      this.logger.error(`Failed to index in Weaviate: ${error.message}`);
      // Content is still approved, just not indexed
    }

    return saved;
  }

  /**
   * Reject content source
   */
  async reject(id: string, reason: string, rejectedBy: string, tenantId?: string): Promise<ContentSource> {
    const contentSource = await this.findOne(id, tenantId);

    contentSource.status = 'rejected';
    contentSource.rejectionReason = reason;
    contentSource.approvedBy = rejectedBy; // Reuse field for rejector

    this.logger.log(`Content source ${id} rejected: ${reason}`);
    return await this.contentSourcesRepository.save(contentSource);
  }

  /**
   * Delete content source (and remove from Weaviate if indexed)
   */
  async remove(id: string, tenantId?: string): Promise<void> {
    const contentSource = await this.findOne(id, tenantId);

    // Remove from Weaviate if indexed
    if (contentSource.weaviateId) {
      try {
        await this.weaviateService.deleteContent(contentSource.weaviateId);
        this.logger.log(`Removed from Weaviate: ${contentSource.weaviateId}`);
      } catch (error) {
        this.logger.error(`Failed to remove from Weaviate: ${error.message}`);
      }
    }

    await this.contentSourcesRepository.remove(contentSource);
    this.logger.log(`Deleted content source: ${id}`);
  }

  /**
   * Semantic search using Weaviate
   */
  async semanticSearch(searchDto: SearchContentDto) {
    const results = await this.weaviateService.semanticSearch({
      query: searchDto.query,
      tenantId: searchDto.tenantId,
      limit: searchDto.limit || 10,
      offset: searchDto.offset || 0,
      filters: {
        type: searchDto.type,
        status: searchDto.status || 'approved', // Only approved by default
      },
    });

    // Enrich with PostgreSQL data from BOTH content_sources and processed_content_outputs
    const enriched = await Promise.all(
      results.map(async (result) => {
        try {
          // Check if this is source_content or processed_content
          if (result.contentCategory === 'processed_content') {
            // Fetch from processed_content_outputs table
            const ProcessedContentOutput = this.contentSourcesRepository.manager.getRepository('ProcessedContentOutput');
            const processedContent = await ProcessedContentOutput.findOne({
              where: { id: result.contentSourceId },
            });

            return {
              ...result,
              contentSource: processedContent, // Return processed content as contentSource for compatibility
            };
          } else {
            // Fetch from content_sources table (original behavior)
            const contentSource = await this.contentSourcesRepository.findOne({
              where: { id: result.contentSourceId },
              relations: ['creator'],
            });

            return {
              ...result,
              contentSource,
            };
          }
        } catch (error) {
          this.logger.error(`Failed to enrich result ${result.contentSourceId}: ${error.message}`);
          return result;
        }
      })
    );

    this.logger.log(`Semantic search for "${searchDto.query}" returned ${enriched.length} results (source + processed)`);
    return enriched;
  }

  /**
   * Link content source to a lesson
   */
  async linkToLesson(
    lessonId: string,
    contentSourceId: string,
    relevanceScore?: number,
  ): Promise<LessonDataLink> {
    // Check if link already exists
    const existing = await this.lessonDataLinksRepository.findOne({
      where: { lessonId, contentSourceId },
    });

    if (existing) {
      // Update relevance score if provided
      if (relevanceScore !== undefined) {
        existing.relevanceScore = relevanceScore;
        return await this.lessonDataLinksRepository.save(existing);
      }
      return existing;
    }

    // Create new link
    const link = this.lessonDataLinksRepository.create({
      lessonId,
      contentSourceId,
      relevanceScore: relevanceScore || 1.0,
    });

    const saved = await this.lessonDataLinksRepository.save(link);
    this.logger.log(`Linked content ${contentSourceId} to lesson ${lessonId}`);
    return saved;
  }

  /**
   * Get content linked to a lesson
   */
  async getLinkedContent(lessonId: string): Promise<ContentSource[]> {
    const links = await this.lessonDataLinksRepository.find({
      where: { lessonId, useInContext: true },
      relations: ['contentSource'],
      order: { relevanceScore: 'DESC' },
    });

    return links.map(link => link.contentSource);
  }

  /**
   * Remove content link from lesson
   */
  async unlinkFromLesson(lessonId: string, contentSourceId: string): Promise<void> {
    await this.lessonDataLinksRepository.delete({ lessonId, contentSourceId });
    this.logger.log(`Unlinked content ${contentSourceId} from lesson ${lessonId}`);
  }

  /**
   * Process YouTube URL and return video data
   */
  async processYouTubeUrl(url: string, startTime?: number, endTime?: number, tenantId?: string) {
    const videoData = await this.youtubeService.processYouTubeUrl(url, startTime, endTime);
    
    this.logger.log(`Processed YouTube video: ${videoData.videoId} - ${videoData.title}`);
    
    return {
      success: true,
      data: videoData,
    };
  }
}

