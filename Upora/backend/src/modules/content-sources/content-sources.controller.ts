import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ContentSourcesService } from './content-sources.service';
import { CreateContentSourceDto } from './dto/create-content-source.dto';
import { UpdateContentSourceDto } from './dto/update-content-source.dto';
import { SearchContentDto } from './dto/search-content.dto';
import { ContentAnalyzerService } from '../../services/content-analyzer.service';
import { AutoPopulatorService } from '../../services/auto-populator.service';
import { FileStorageService } from '../../services/file-storage.service';

@Controller('content-sources')
export class ContentSourcesController {
  constructor(
    private readonly contentSourcesService: ContentSourcesService,
    private readonly contentAnalyzerService: ContentAnalyzerService,
    private readonly autoPopulatorService: AutoPopulatorService,
    private readonly fileStorageService: FileStorageService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateContentSourceDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    try {
      // tenantId and userId come from headers and are added by the service
      return await this.contentSourcesService.create(createDto, tenantId, userId);
    } catch (error) {
      if (error.message?.includes('already exists')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return this.contentSourcesService.findAll(tenantId, status);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateContentSourceDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.update(id, updateDto, tenantId);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.submit(id, tenantId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') approvedBy: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.approve(id, approvedBy, tenantId);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Headers('x-user-id') rejectedBy: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.reject(id, reason, rejectedBy, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.contentSourcesService.remove(id, tenantId);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  semanticSearch(@Body() searchDto: SearchContentDto) {
    return this.contentSourcesService.semanticSearch(searchDto);
  }

  @Post('link-to-lesson')
  @HttpCode(HttpStatus.CREATED)
  linkToLesson(
    @Body('lessonId') lessonId: string,
    @Body('contentSourceId') contentSourceId: string,
    @Body('relevanceScore') relevanceScore?: number,
  ) {
    return this.contentSourcesService.linkToLesson(lessonId, contentSourceId, relevanceScore);
  }

  @Get('lesson/:lessonId')
  getLinkedContent(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.contentSourcesService.getLinkedContent(lessonId);
  }

  @Delete('lesson/:lessonId/content/:contentSourceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkFromLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('contentSourceId', ParseUUIDPipe) contentSourceId: string,
  ) {
    return this.contentSourcesService.unlinkFromLesson(lessonId, contentSourceId);
  }

  @Post('process-youtube')
  @HttpCode(HttpStatus.OK)
  async processYouTube(
    @Body('url') url: string,
    @Body('startTime') startTime?: number,
    @Body('endTime') endTime?: number,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    console.log('[ContentSourcesController] 🎬 Processing YouTube URL...');
    return this.contentSourcesService.processYouTubeUrl(url, startTime, endTime, tenantId, userId);
  }

  @Post(':id/analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeContent(
    @Param('id', ParseUUIDPipe) contentSourceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    try {
      console.log('[ContentSourcesController] 🤖 Analyzing content source with LLM...', contentSourceId);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }
      const results = await this.contentAnalyzerService.analyzeContentSource(contentSourceId, userId);
      return {
        contentSourceId,
        generatedOutputs: results.length,
        results: results.map(r => ({
          interactionType: r.interactionTypeId,
          confidence: r.confidence,
          tokensUsed: r.tokensUsed,
        })),
      };
    } catch (error) {
      console.error('[ContentSourcesController] ❌ Error analyzing content:', error);
      throw error;
    }
  }

  @Get(':id/lessons')
  @HttpCode(HttpStatus.OK)
  async getLessonsForContentSource(
    @Param('id', ParseUUIDPipe) contentSourceId: string,
  ): Promise<{ lessons: Array<{ id: string; title: string }> }> {
    try {
      const lessons = await this.contentSourcesService.getLessonsForContentSource(contentSourceId);
      return { lessons };
    } catch (error) {
      console.error('[ContentSourcesController] ❌ Error getting lessons for content source:', error);
      throw error;
    }
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  async reprocessContent(
    @Param('id', ParseUUIDPipe) contentSourceId: string,
    @Headers('x-user-id') userId: string,
  ) {
    try {
      console.log('[ContentSourcesController] 🔄 Marking content source for reprocessing:', contentSourceId);
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }
      const contentSource = await this.contentSourcesService.findOne(contentSourceId);
      
      if (!contentSource) {
        throw new NotFoundException(`Content source ${contentSourceId} not found`);
      }
      
      // Delete existing processed content outputs for this source
      // Processing will happen again when the content source is approved
      await this.contentSourcesService.deleteProcessedOutputs(contentSourceId);
      console.log('[ContentSourcesController] ✅ Deleted existing processed outputs');
      
      // Set content source status back to pending
      // Processing will happen automatically when approved
      await this.contentSourcesService.updateStatus(contentSourceId, 'pending');
      console.log('[ContentSourcesController] ✅ Content source status set to pending - will be processed on approval');
      
      return {
        success: true,
        contentSourceId,
        message: 'Content source marked for reprocessing. It will be processed again when approved.',
      };
    } catch (error) {
      console.error('[ContentSourcesController] ❌ Error reprocessing content:', error);
      throw error;
    }
  }

  @Post('auto-populate/text')
  @HttpCode(HttpStatus.OK)
  async autoPopulateText(
    @Body('textContent') textContent: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    console.log('[ContentSourcesController] ✨ Auto-populating text content fields...');
    const result = await this.autoPopulatorService.autoPopulateText(textContent, userId, tenantId);
    return result;
  }

  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max (for media files)
  }))
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: any,
    @Body('type') type: string,
    @Body('title') title: string,
    @Body('metadata') metadataStr: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Handle media file uploads
    if (type === 'media') {
      return this.uploadMediaFile(file, title, metadataStr, tenantId, userId);
    }

    // Validate file type for non-media files
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOCX, and TXT files are allowed.');
    }

    // Determine content source type
    let contentType: 'pdf' | 'text' = 'text';
    if (file.mimetype === 'application/pdf') {
      contentType = 'pdf';
    }

    // Save file
    const { url, fileName } = await this.fileStorageService.saveFile(file, 'content-sources');

    // Parse metadata
    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = typeof metadataStr === 'string' ? JSON.parse(metadataStr) : metadataStr;
      } catch (e) {
        console.warn('[ContentSourcesController] Failed to parse metadata:', e);
      }
    }

    // Create content source
    const contentSource = await this.contentSourcesService.create({
      type: contentType,
      filePath: url,
      title: title || `Uploaded: ${fileName}`,
      metadata: {
        ...metadata,
        originalFileName: fileName,
        uploadedVia: 'iframe-guide',
      },
    }, tenantId, userId);

    return {
      id: contentSource.id,
      contentSourceId: contentSource.id,
      filePath: url,
      fileName,
      contentSource,
    };
  }

  /**
   * Upload media file (video or audio)
   */
  private async uploadMediaFile(
    file: any,
    title: string | undefined,
    metadataStr: string | undefined,
    tenantId: string,
    userId: string,
  ) {
    // Validate media file type
    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');

    if (!isVideo && !isAudio) {
      throw new BadRequestException('Invalid media file type. Only video and audio files are allowed.');
    }

    // Validate file size (500MB max)
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${maxFileSize / (1024 * 1024)}MB`);
    }

    // Save file
    const { url, fileName } = await this.fileStorageService.saveFile(file, 'media');

    // Parse metadata
    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = typeof metadataStr === 'string' ? JSON.parse(metadataStr) : metadataStr;
      } catch (e) {
        console.warn('[ContentSourcesController] Failed to parse metadata:', e);
      }
    }

    // Extract basic metadata (duration will be extracted during processing)
    const mediaType = isVideo ? 'video' : 'audio';
    metadata = {
      ...metadata,
      originalFileName: fileName,
      mimeType: file.mimetype,
      fileSize: file.size,
      mediaType,
      uploadedVia: 'media-upload',
    };

    // Create content source
    const contentSource = await this.contentSourcesService.create({
      type: 'media',
      filePath: url,
      title: title || `Uploaded: ${fileName}`,
      metadata,
    }, tenantId, userId);

    return {
      id: contentSource.id,
      contentSourceId: contentSource.id,
      filePath: url,
      fileName,
      mediaType,
      fileSize: file.size,
      contentSource,
    };
  }
}

