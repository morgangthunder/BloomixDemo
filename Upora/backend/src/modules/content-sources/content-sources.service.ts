import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentSource } from '../../entities/content-source.entity';
import { LessonDataLink } from '../../entities/lesson-data-link.entity';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { WeaviateService } from '../../services/weaviate.service';
import { YouTubeService } from '../../services/youtube.service';
import { ContentAnalyzerService } from '../../services/content-analyzer.service';
import { MediaMetadataService } from '../../services/media-metadata.service';
import { FileStorageService } from '../../services/file-storage.service';
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
    @InjectRepository(ProcessedContentOutput)
    private processedContentRepository: Repository<ProcessedContentOutput>,
    private weaviateService: WeaviateService,
    private youtubeService: YouTubeService,
    private contentAnalyzerService: ContentAnalyzerService,
    private mediaMetadataService: MediaMetadataService,
    private fileStorageService: FileStorageService,
  ) {}

  /**
   * Find content source by URL (normalized comparison)
   */
  async findByUrl(sourceUrl: string, tenantId?: string): Promise<ContentSource | null> {
    if (!sourceUrl) return null;
    
    // Normalize URL for comparison (remove protocol, www, trailing slashes, lowercase)
    const normalizeUrl = (url: string): string => {
      return url
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
    };
    
    const normalizedSearchUrl = normalizeUrl(sourceUrl);
    
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    // Get all content sources with URLs and check normalized versions
    const allSources = await this.contentSourcesRepository.find({ where });
    
    // Find matching URL (normalized comparison)
    const matchingSource = allSources.find(source => {
      if (!source.sourceUrl) return false;
      const normalizedSourceUrl = normalizeUrl(source.sourceUrl);
      return normalizedSourceUrl === normalizedSearchUrl;
    });
    
    return matchingSource || null;
  }

  /**
   * Create a new content source
   * Checks for existing URL and reuses if found
   */
  async create(
    createDto: CreateContentSourceDto, 
    tenantId: string, 
    userId: string
  ): Promise<ContentSource> {
    // Check if URL already exists (for URL type content sources)
    if (createDto.type === 'url' && createDto.sourceUrl) {
      const existingSource = await this.findByUrl(createDto.sourceUrl, tenantId);
      
      if (existingSource) {
        this.logger.log(`Content source with URL already exists: ${existingSource.id}`);
        throw new Error(`A content source with this URL already exists. Please use the existing content source instead of creating a duplicate.`);
      }
    }
    
    const contentSource = this.contentSourcesRepository.create({
      ...createDto,
      tenantId,
      createdBy: userId,
      status: 'pending', // Default status
    });
    const saved = await this.contentSourcesRepository.save(contentSource);
    
    this.logger.log(`Created content source: ${saved.id} (${saved.type}) by user ${userId}`);
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

    const sources = await this.contentSourcesRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['creator', 'approver'], // lessonUsages removed until junction table is created
    });

    // TODO: Add lesson count metadata once junction table is created
    return sources.map(source => ({
      ...source,
      lessonCount: 0, // Placeholder until junction table exists
      lessons: [], // Placeholder until junction table exists
    })) as any;
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

    // DON'T save approval status yet - we'll do that after processing succeeds
    // First, try to process the content source
    let processedOutputCreated = false;
    let processingError: Error | null = null;

    try {
      // If this is an iframe guide URL, use specialized processing
      if (contentSource.type === 'url' && contentSource.metadata?.source === 'iframe-guide' && contentSource.sourceUrl) {
        this.logger.log(`[ContentSources] 🌐 Auto-processing iframe guide URL: ${contentSource.id}`);
        const result = await this.contentAnalyzerService.processIframeGuideUrl(contentSource.id, approvedBy);
        
        // Check if processed content was actually created
        // processIframeGuideUrl should ALWAYS return processedOutputId now (even when no guidance found)
        if (result && result.processedOutputId) {
          // Verify processed output exists
          const processedOutput = await this.processedContentRepository.findOne({
            where: {
              id: result.processedOutputId,
            },
          });
          
          if (processedOutput) {
            processedOutputCreated = true;
            this.logger.log(`[ContentSources] ✅ Iframe guide URL processed successfully - processed content created (ID: ${result.processedOutputId})`);
          } else {
            processingError = new Error(`Processed content with ID ${result.processedOutputId} was not found in database`);
            this.logger.error(`[ContentSources] ❌ ${processingError.message}`);
          }
        } else if (result && !result.processedOutputId) {
          processingError = new Error('Processed content ID not returned from iframe guide URL processing');
          this.logger.error(`[ContentSources] ❌ ${processingError.message}`);
        } else {
          processingError = new Error('Processing returned null or undefined');
          this.logger.error(`[ContentSources] ❌ ${processingError.message}`);
        }
      } else if (contentSource.type === 'media') {
        // Handle media file processing
        this.logger.log(`[ContentSources] 🎬 Auto-processing media file: ${contentSource.id}`);
        await this.processMediaFile(contentSource, approvedBy);
        processedOutputCreated = true;
        this.logger.log(`[ContentSources] ✅ Media file processed successfully`);
      } else {
        // For all other content types, use standard content analysis
        this.logger.log(`[ContentSources] 🔍 Auto-processing content source: ${contentSource.id} (type: ${contentSource.type})`);
        const results = await this.contentAnalyzerService.analyzeContentSource(contentSource.id, approvedBy);
        
        if (results && results.length > 0) {
          // Verify processed output exists
          const processedOutput = await this.processedContentRepository.findOne({
            where: {
              contentSourceId: contentSource.id,
              outputType: 'true-false-selection',
            },
          });
          
          if (processedOutput) {
            processedOutputCreated = true;
            this.logger.log(`[ContentSources] ✅ Content source processed successfully - generated ${results.length} output(s)`);
          } else {
            processingError = new Error('Processed content was not created despite successful analysis');
            this.logger.error(`[ContentSources] ❌ ${processingError.message}`);
          }
        } else {
          processingError = new Error('Content analysis failed - no processed content generated');
          this.logger.error(`[ContentSources] ❌ ${processingError.message}`);
        }
      }
    } catch (error) {
      processingError = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`[ContentSources] ❌ Failed to auto-process content source: ${processingError.message}`);
    }

    // If processing failed, throw error and don't approve
    if (!processedOutputCreated) {
      const errorMessage = processingError?.message || 'Failed to create processed content';
      this.logger.error(`[ContentSources] ❌ Approval rejected: ${errorMessage}`);
      throw new Error(`Cannot approve content source: ${errorMessage}. Please ensure the content can be processed before approving.`);
    }

    // Only now update status to approved since processing succeeded
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
   * Update content source status
   */
  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected', tenantId?: string): Promise<ContentSource> {
    const contentSource = await this.findOne(id, tenantId);
    contentSource.status = status;
    
    // Clear approval fields if setting to pending
    if (status === 'pending') {
      (contentSource as any).approvedBy = null;
      (contentSource as any).approvedAt = null;
      (contentSource as any).rejectionReason = null;
    }
    
    this.logger.log(`Content source ${id} status updated to: ${status}`);
    return await this.contentSourcesRepository.save(contentSource);
  }

  /**
   * Get lessons that use this content source
   */
  async getLessonsForContentSource(contentSourceId: string): Promise<Array<{ id: string; title: string }>> {
    const links = await this.lessonDataLinksRepository.find({
      where: { contentSourceId },
      relations: ['lesson'],
    });

    return links
      .filter(link => link.lesson)
      .map(link => ({
        id: link.lesson.id,
        title: link.lesson.title,
      }));
  }

  /**
   * Delete processed outputs for a content source
   */
  async deleteProcessedOutputs(contentSourceId: string): Promise<void> {
    try {
      const processedOutputs = await this.processedContentRepository.find({
        where: { contentSourceId },
      });

      if (processedOutputs.length > 0) {
        this.logger.log(`Deleting ${processedOutputs.length} processed output(s) for content source ${contentSourceId}`);
        await this.processedContentRepository.remove(processedOutputs);
        this.logger.log(`✅ Deleted ${processedOutputs.length} processed output(s)`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete processed outputs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete content source (and remove from Weaviate if indexed)
   * Also deletes associated processed outputs
   */
  async remove(id: string, tenantId?: string): Promise<void> {
    const contentSource = await this.findOne(id, tenantId);

    // Delete associated processed outputs
    try {
      const processedOutputs = await this.processedContentRepository.find({
        where: { contentSourceId: id },
      });

      if (processedOutputs.length > 0) {
        this.logger.log(`Deleting ${processedOutputs.length} processed output(s) for content source ${id}`);
        await this.processedContentRepository.remove(processedOutputs);
        this.logger.log(`✅ Deleted ${processedOutputs.length} processed output(s)`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete processed outputs: ${error.message}`);
      // Continue with content source deletion even if processed outputs deletion fails
    }

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
   * Process media file (video or audio)
   * Extracts metadata and creates processed output
   */
  private async processMediaFile(contentSource: ContentSource, approvedBy: string): Promise<void> {
    if (!contentSource.filePath) {
      throw new Error('Media file path is missing');
    }

    // Get media type from metadata
    const mediaType = contentSource.metadata?.mediaType as 'video' | 'audio';
    if (!mediaType || (mediaType !== 'video' && mediaType !== 'audio')) {
      throw new Error('Invalid or missing media type in metadata');
    }

    // Get file path (convert URL to file system path)
    const urlPath = contentSource.filePath.replace('/uploads/', '');
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = require('path').join(uploadDir, urlPath);

    // Extract metadata
    const metadata = await this.mediaMetadataService.extractMetadata(filePath, mediaType);

    // Update content source metadata with extracted info
    contentSource.metadata = {
      ...contentSource.metadata,
      ...metadata,
    };
    await this.contentSourcesRepository.save(contentSource);

    // Create processed output
    const processedOutput = this.processedContentRepository.create({
      lessonId: '00000000-0000-0000-0000-000000000000', // Placeholder - will be linked to lessons later
      contentSourceId: contentSource.id,
      outputName: contentSource.title || contentSource.metadata?.originalFileName || 'Media File',
      outputType: 'uploaded-media',
      outputData: {
        mediaFileUrl: contentSource.filePath,
        mediaFileName: contentSource.metadata?.originalFileName || 'unknown',
        mediaFileType: mediaType,
        mediaFileSize: metadata.fileSize,
        mediaFileDuration: metadata.duration,
        mediaMetadata: {
          codec: metadata.codec,
          bitrate: metadata.bitrate,
          width: metadata.width,
          height: metadata.height,
          fps: metadata.fps,
          sampleRate: metadata.sampleRate,
          channels: metadata.channels,
        },
        // Transcription will be added later (async processing)
        transcription: null,
      },
      createdBy: approvedBy,
    });

    await this.processedContentRepository.save(processedOutput);
    this.logger.log(`✅ Created processed output for media file: ${processedOutput.id}`);
  }

  /**
   * Process YouTube URL - Two-step flow:
   * Step 1: Save URL as source content
   * Step 2: Return processed data (frontend will save as processed_content_output)
   */
  async processYouTubeUrl(url: string, startTime?: number, endTime?: number, tenantId?: string, userId?: string) {
    this.logger.log(`🎬 Processing YouTube URL: ${url}`);
    
    // Step 1: Fetch video data from YouTube API
    const videoData = await this.youtubeService.processYouTubeUrl(url, startTime, endTime);
    
    this.logger.log(`✅ Fetched video data: ${videoData.videoId} - ${videoData.title}`);
    
    // Step 2: Save URL as source content (auto-approved for MVP)
    const sourceContent = this.contentSourcesRepository.create({
      tenantId: tenantId || '00000000-0000-0000-0000-000000000001',
      createdBy: userId || '00000000-0000-0000-0000-000000000011',
      type: 'url', // YouTube URLs are stored as 'url' type
      sourceUrl: url,
      title: videoData.title,
      summary: videoData.description || `YouTube video: ${videoData.title}`,
      fullText: videoData.transcript || '',
      status: 'approved', // Auto-approve for MVP (can add approval workflow later)
      metadata: {
        videoId: videoData.videoId,
        channel: videoData.channel,
        duration: videoData.duration,
        topics: [],
        keywords: videoData.title.split(' ').filter(w => w.length > 3),
        difficulty: 'beginner',
        language: 'en',
      },
    } as any); // Type cast needed due to relation properties
    
    const savedSourceRaw = await this.contentSourcesRepository.save(sourceContent);
    let savedSource = (Array.isArray(savedSourceRaw) ? savedSourceRaw[0] : savedSourceRaw) as ContentSource;
    this.logger.log(`📚 Saved source content: ${savedSource.id}`);
    
    // Step 3: Index source content in Weaviate
    try {
      const weaviateId = await this.weaviateService.indexContent({
        contentSourceId: savedSource.id,
        tenantId: savedSource.tenantId,
        summary: savedSource.summary,
        fullText: savedSource.fullText || '',
        topics: savedSource.metadata?.topics || [],
        keywords: savedSource.metadata?.keywords || [],
        type: savedSource.type,
        status: savedSource.status,
        title: savedSource.title,
        sourceUrl: savedSource.sourceUrl || '',
        contentCategory: 'source_content',
        videoId: videoData.videoId,
        channel: videoData.channel,
        transcript: videoData.transcript,
      });
      
      savedSource.weaviateId = weaviateId;
      savedSource = await this.contentSourcesRepository.save(savedSource);
      this.logger.log(`🔍 Indexed in Weaviate: ${weaviateId}`);
    } catch (error) {
      this.logger.error(`Failed to index in Weaviate: ${error.message}`);
    }
    
    // Step 4: Return video data + source content ID for frontend to save as processed output
    return {
      success: true,
      data: videoData,
      sourceContentId: savedSource.id, // Frontend will use this when saving processed output
    };
  }
}

