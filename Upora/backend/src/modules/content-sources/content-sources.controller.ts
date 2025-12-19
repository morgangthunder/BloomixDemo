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
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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

  @Post('process-vimeo')
  @HttpCode(HttpStatus.OK)
  async processVimeo(
    @Body('url') url: string,
    @Body('startTime') startTime?: number,
    @Body('endTime') endTime?: number,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    console.log('[ContentSourcesController] 🎬 Processing Vimeo URL...');
    return this.contentSourcesService.processVimeoUrl(url, startTime, endTime, tenantId, userId);
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

  @Get('processed-content/:id/file')
  async getProcessedContentFile(
    @Param('id', ParseUUIDPipe) processedContentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      console.log(
        '[ContentSourcesController] 🎬 Request for processed content file:',
        processedContentId,
      );
      const filePathOrUrl =
        await this.contentSourcesService.getProcessedContentFilePath(
          processedContentId,
        );
      console.log('[ContentSourcesController] 🎬 Resolved file path/URL:', filePathOrUrl);
      if (!filePathOrUrl) {
        console.error(
          '[ContentSourcesController] ❌ File path not found for processed content:',
          processedContentId,
        );
        throw new NotFoundException('Media file not found for this processed content');
      }

      // Check if it's a cloud storage URL (S3/MinIO)
      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        // Proxy the file from MinIO/S3 through the backend to ensure proper headers and CORS
        console.log('[ContentSourcesController] Proxying file from MinIO/S3:', filePathOrUrl);
        
        try {
          // Check if file exists first
          const fileExists = await this.fileStorageService.fileExists(filePathOrUrl);
          if (!fileExists) {
            throw new NotFoundException(`Media file not found in storage: ${filePathOrUrl}`);
          }
          
          // Get file stream from MinIO/S3 using the adapter directly to get metadata
          const adapter = (this.fileStorageService as any).adapter;
          if (!adapter || !adapter.s3Client) {
            throw new Error('S3 adapter not available');
          }
          
          const { GetObjectCommand } = require('@aws-sdk/client-s3');
          
          // Extract key from URL
          const urlObj = new URL(filePathOrUrl);
          const key = urlObj.pathname.replace(/^\/upora-uploads\//, '');
          const bucket = adapter.bucket || process.env.S3_BUCKET || 'upora-uploads';
          
          console.log(`[ContentSourcesController] Fetching from MinIO - Bucket: ${bucket}, Key: ${key}`);
          
          const getObjectCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          });
          
          console.log(`[ContentSourcesController] 🎬 Sending GetObjectCommand to MinIO...`);
          const s3Response = await adapter.s3Client.send(getObjectCommand);
          let fileStream: any = s3Response.Body;
          const contentLength = s3Response.ContentLength;
          const contentTypeFromS3 = s3Response.ContentType;
          
          console.log(`[ContentSourcesController] ✅ S3 Response received - ContentLength: ${contentLength}, ContentType: ${contentTypeFromS3}`);
          console.log(`[ContentSourcesController] 🎬 Stream type: ${fileStream?.constructor?.name || typeof fileStream}`);
          console.log(`[ContentSourcesController] 🎬 Stream has pipe: ${typeof fileStream?.pipe === 'function'}`);
          console.log(`[ContentSourcesController] 🎬 Stream has on: ${typeof fileStream?.on === 'function'}`);
          
          if (!fileStream) {
            throw new Error('File stream is null from S3/MinIO');
          }
          
          // AWS SDK v3 returns a Readable stream in Node.js, but we need to ensure it's a proper Node.js stream
          // If it's a web stream, convert it
          if (fileStream && typeof fileStream.getReader === 'function') {
            console.log(`[ContentSourcesController] 🎬 Converting web stream to Node.js stream...`);
            const { Readable } = require('stream');
            const reader = fileStream.getReader();
            const nodeStream = new Readable({
              async read() {
                try {
                  const { done, value } = await reader.read();
                  if (done) {
                    this.push(null);
                  } else {
                    this.push(Buffer.from(value));
                  }
                } catch (error: any) {
                  this.destroy(error);
                }
              }
            });
            fileStream = nodeStream;
          }
          
          // Determine content type (prefer S3 metadata, fallback to extension)
          const ext = filePathOrUrl.split('.').pop()?.toLowerCase();
          let contentType = contentTypeFromS3 || 'video/mp4';
          if (!contentTypeFromS3) {
            if (ext === 'mp4') contentType = 'video/mp4';
            else if (ext === 'webm') contentType = 'video/webm';
            else if (ext === 'ogv') contentType = 'video/ogg';
            else if (ext === 'mp3') contentType = 'audio/mpeg';
            else if (ext === 'wav') contentType = 'audio/wav';
            else if (ext === 'ogg' || ext === 'oga') contentType = 'audio/ogg';
          }
          
          // Set headers for media playback
          res.setHeader('Content-Type', contentType);
          if (contentLength) {
            res.setHeader('Content-Length', contentLength.toString());
          }
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
          res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
          
          // Handle range requests for video seeking
          const range = req.headers.range;
          if (range && contentLength) {
            // Parse range header
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
            const chunkSize = (end - start) + 1;
            
            // Re-fetch with range from S3/MinIO
            const { GetObjectCommand } = require('@aws-sdk/client-s3');
            const rangeGetObjectCommand = new GetObjectCommand({
              Bucket: bucket,
              Key: key,
              Range: `bytes=${start}-${end}`,
            });
            
            try {
              const rangeResponse = await adapter.s3Client.send(rangeGetObjectCommand);
              const rangeStream = rangeResponse.Body;
              
              res.status(206);
              res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
              res.setHeader('Content-Length', chunkSize.toString());
              
              console.log(`[ContentSourcesController] Range request: ${start}-${end}/${contentLength} (streaming range from MinIO)`);
              
              // Handle range stream errors
              rangeStream.on('error', (error: any) => {
                console.error('[ContentSourcesController] ❌ Range stream error:', error);
                if (!res.headersSent) {
                  res.status(500).json({ error: 'Failed to stream media range', message: error.message });
                } else {
                  res.end();
                }
              });
              
              // Pipe the range stream to the response
              rangeStream.pipe(res);
              return;
            } catch (rangeError: any) {
              console.error('[ContentSourcesController] ❌ Range request failed, falling back to full stream:', rangeError);
              // Fall through to stream full file
            }
          }
          
          // Handle stream errors
          fileStream.on('error', (error: any) => {
            console.error('[ContentSourcesController] ❌ Stream error:', error);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Failed to stream media file', message: error.message });
            } else {
              res.end();
            }
          });
          
          // Handle stream end
          fileStream.on('end', () => {
            console.log('[ContentSourcesController] ✅ Stream ended successfully');
          });
          
          // Pipe the file stream to the response
          // Note: When using @Res(), we must handle the response manually
          fileStream.pipe(res);
          
          // Return undefined to prevent NestJS from trying to send a response
          return;
        } catch (error: any) {
          console.error('[ContentSourcesController] ❌ Error proxying file from MinIO/S3:', error);
          throw new NotFoundException(`Failed to load media file: ${error.message}`);
        }
      }

      // Local storage - serve file directly
      // Set proper headers for media files to allow playback
      const ext = filePathOrUrl.split('.').pop()?.toLowerCase();
      let contentType = 'video/mp4'; // Default
      if (ext === 'mp4') contentType = 'video/mp4';
      else if (ext === 'webm') contentType = 'video/webm';
      else if (ext === 'ogv') contentType = 'video/ogg';
      else if (ext === 'mp3') contentType = 'audio/mpeg';
      else if (ext === 'wav') contentType = 'audio/wav';
      else if (ext === 'ogg' || ext === 'oga') contentType = 'audio/ogg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for media playback
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
      return res.sendFile(filePathOrUrl);
    } catch (error) {
      console.error('[ContentSourcesController] ❌ Error serving processed content file:', error);
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

