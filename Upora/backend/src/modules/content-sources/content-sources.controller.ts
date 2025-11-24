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
  create(
    @Body() createDto: CreateContentSourceDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    // tenantId and userId come from headers and are added by the service
    return this.contentSourcesService.create(createDto, tenantId, userId);
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
    console.log('[ContentSourcesController] 🤖 Analyzing content source with LLM...');
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
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

    // Validate file type
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
}

