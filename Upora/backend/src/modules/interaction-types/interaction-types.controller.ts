import { Controller, Get, Param, Post, Put, Body, Headers, Delete, UseInterceptors, UploadedFile, UsePipes, ValidationPipe, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InteractionTypesService } from './interaction-types.service';
import { CreateInteractionTypeDto, UpdateInteractionTypeDto } from './dto/interaction-type.dto';
import { FileStorageService } from '../../services/file-storage.service';
import { ContentSourcesService } from '../content-sources/content-sources.service';

/** Entity columns allowed in PUT update (excludes id, createdAt, updatedAt). */
const UPDATE_ALLOWED_KEYS = new Set([
  'name', 'category', 'description', 'schema', 'generationPrompt', 'pixiRenderer',
  'interactionTypeCategory', 'htmlCode', 'cssCode', 'jsCode', 'iframeUrl', 'iframeConfig',
  'iframeDocumentUrl', 'iframeDocumentFileName', 'configSchema', 'sampleData', 'minConfidence',
  'teachStageFit', 'requiresResources', 'cognitiveLoad', 'estimatedDuration', 'assetRequirements',
  'mobileAdaptations', 'scoringLogic', 'isActive', 'aiPromptTemplate', 'aiEventHandlers',
  'aiResponseActions', 'instanceDataSchema', 'userProgressSchema', 'mediaConfig', 'videoUrlConfig',
  'widgets',
]);

/** Sanitize value for JSONB: JSON round-trip strips undefined, functions, etc. */
function sanitizeJsonb(val: any): any {
  if (val === null || val === undefined) return val;
  try {
    return JSON.parse(JSON.stringify(val));
  } catch {
    return null;
  }
}

@Controller('interaction-types')
export class InteractionTypesController {
  constructor(
    private readonly interactionTypesService: InteractionTypesService,
    private readonly fileStorageService: FileStorageService,
    private readonly contentSourcesService: ContentSourcesService,
  ) {}

  @Get()
  async findAll() {
    return this.interactionTypesService.findAll();
  }

  // Specific routes must come before parameterized routes to avoid route conflicts
  @Post('seed')
  async seed() {
    try {
      await this.interactionTypesService.seedTrueFalseSelection();
      await this.interactionTypesService.seedVideoUrlInteraction();
      await this.interactionTypesService.seedSDKTestVideoUrlInteraction();
      await this.interactionTypesService.updateSDKTestPixiJSInteraction();
      await this.interactionTypesService.updateSDKTestHTMLInteraction();
      await this.interactionTypesService.updateTrueFalseSelectionCompleteInteraction();
      return { message: 'Interaction types seeded successfully' };
    } catch (error) {
      console.error('[InteractionTypesController] ❌ Seed error:', error);
      throw error;
    }
  }

  @Post('update-true-false-complete')
  async updateTrueFalseComplete() {
    await this.interactionTypesService.fixTrueFalseDuplicateTotalTrue();
    await this.interactionTypesService.updateTrueFalseSelectionCompleteInteraction();
    await this.interactionTypesService.updateTrueFalseToSaveScore();
    return { message: 'True/False Selection interaction updated with completeInteraction() and score saving' };
  }

  @Post('fix-true-false-duplicate-totaltrue')
  async fixTrueFalseDuplicateTotalTrue() {
    await this.interactionTypesService.fixTrueFalseDuplicateTotalTrue();
    return { message: 'Fixed duplicate totalTrue declarations in True/False Selection interaction' };
  }

  @Post('replace-true-false-scoring')
  async replaceTrueFalseScoring() {
    await this.interactionTypesService.replaceTrueFalseJsWithFixedScoring();
    return { message: 'Replaced true-false-selection JS with fixed scoring (full overwrite)' };
  }

  @Post('update-sdk-test-pixijs')
  async updateSDKTestPixiJS() {
    await this.interactionTypesService.updateSDKTestPixiJSInteraction();
    return { message: 'SDK Test PixiJS interaction updated successfully' };
  }

  @Post('update-sdk-test-html')
  async updateSDKTestHTML() {
    console.log('[Controller] 📥 POST /update-sdk-test-html received');
    try {
      const result = await this.interactionTypesService.updateSDKTestHTMLInteraction();
      console.log('[Controller] ✅ updateSDKTestHTML completed successfully');
      return { message: 'SDK Test HTML interaction updated successfully', id: result ? (result as any).id : undefined };
    } catch (error) {
      console.error('[Controller] ❌ Error in updateSDKTestHTML:', error);
      throw error;
    }
  }

  @Post('update-config-schemas')
  async updateConfigSchemas() {
    await this.interactionTypesService.updateConfigSchemaForExistingInteractions();
    return { message: 'Config schemas updated successfully for all interactions' };
  }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  }))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body('interactionId') interactionId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!interactionId) {
      throw new BadRequestException('Interaction ID is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PDF, DOCX, and TXT files are allowed.');
    }

    return this.interactionTypesService.uploadDocument(interactionId, file);
  }

  @Post('upload-audio')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  async uploadAudio(
    @UploadedFile() file: any,
    @Body('title') title: string,
    @Body('interactionTypeId') interactionTypeId: string,
    @Body('interactionTypeName') interactionTypeName: string,
    @Body('contentScope') contentScope: string,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedAudio = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
      'audio/aac', 'audio/webm', 'audio/flac', 'audio/x-m4a', 'audio/mp4',
    ];

    if (!allowedAudio.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: MP3, WAV, OGG, AAC, FLAC, M4A, WebM audio.',
      );
    }

    const saved = await this.fileStorageService.saveFile(file, 'media');

    const metadata: any = {
      mediaType: 'audio',
      mimeType: file.mimetype,
      fileSize: file.size,
      originalFileName: file.originalname,
    };
    if (contentScope === 'interaction-type-default') {
      metadata.contentScope = 'interaction-type-default';
      if (interactionTypeId) metadata.interactionTypeId = interactionTypeId;
      if (interactionTypeName) metadata.interactionTypeName = interactionTypeName;
    }

    const contentSource = await this.contentSourcesService.create(
      {
        type: 'media',
        title: title || file.originalname,
        sourceUrl: null as any,
        filePath: saved.url,
        metadata,
      } as any,
      tenantId || 'default',
      userId || 'system',
    );

    return {
      contentSourceId: contentSource.id,
      status: contentSource.status,
      fileName: file.originalname,
      title: contentSource.title,
    };
  }

  // Widget endpoints - must come before :id routes to avoid conflicts
  @Get('widgets/registry')
  async getWidgetRegistry() {
    return this.interactionTypesService.getWidgetRegistry();
  }

  @Get('widgets/samples')
  async getWidgetSampleConfigs() {
    return this.interactionTypesService.getWidgetSampleConfigs();
  }

  @Post('widgets/generate-code')
  async generateWidgetCode(@Body() body: { widgetId: string; config: any }) {
    const { widgetId, config } = body;
    if (!widgetId) {
      throw new BadRequestException('widgetId is required');
    }
    const html = this.interactionTypesService.generateWidgetHTML(widgetId, config);
    const css = this.interactionTypesService.generateWidgetCSS(widgetId);
    const js = this.interactionTypesService.generateWidgetJS(widgetId, config);
    return { html, css, js };
  }

  @Get(':id/widgets')
  async getWidgets(@Param('id') id: string) {
    return this.interactionTypesService.getWidgets(id);
  }

  @Put(':id/widgets')
  async updateWidgets(
    @Param('id') id: string,
    @Body() widgets: any,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    // TODO: Add super-admin role check
    return this.interactionTypesService.updateWidgets(id, widgets);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.interactionTypesService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreateInteractionTypeDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    // TODO: Add super-admin role check
    return this.interactionTypesService.create(dto);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: false }))
  async update(
    @Param('id') id: string,
    @Body() dto: any, // Use any for now to avoid DTO validation issues
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    try {
      console.log(`[InteractionTypesController] 📥 PUT /interaction-types/${id}`);
      console.log(`[InteractionTypesController] 📦 Received data keys: ${Object.keys(dto).join(', ')}`);
      if (dto.widgets) {
        console.log(`[InteractionTypesController] 🔍 Widgets data:`, JSON.stringify(dto.widgets, null, 2));
      }
      // TODO: Add super-admin role check
      // Remove fields that shouldn't be updated
      // config is not a direct column - it's part of the interaction's configuration
      // but stored elsewhere (e.g., in lesson-specific interaction instances)
      const { id: bodyId, createdAt, updatedAt, contentOutputId, config, ...rest } = dto;
      // contentOutputId is for interaction instances, not interaction types
      // It's used for testing in the builder but shouldn't be saved to the type
      
      // Build updateData: only allowed entity columns
      const updateData: Record<string, any> = {};
      for (const key of Object.keys(rest)) {
        if (!UPDATE_ALLOWED_KEYS.has(key)) continue;
        const v = rest[key];
        if (v === null || v === undefined) continue;
        updateData[key] = v;
      }
      
      // Validate and sanitize widgets
      if (updateData.widgets) {
        try {
          const w = updateData.widgets;
          if (!w.instances || !Array.isArray(w.instances)) {
            console.warn('[InteractionTypesController] ⚠️ Invalid widgets.instances structure, removing widgets');
            delete updateData.widgets;
          } else {
            const valid = w.instances.filter((i: any) => i && typeof i === 'object' && i.id && i.type);
            if (valid.length === 0) {
              updateData.widgets = null;
            } else {
              updateData.widgets = { instances: valid };
            }
          }
        } catch (e: any) {
          console.error('[InteractionTypesController] ❌ Error validating widgets:', e);
          delete updateData.widgets;
        }
      }
      
      // Sanitize JSONB columns for safe DB write (strip undefined, functions, etc.)
      const JSONB_KEYS = [
        'schema', 'iframeConfig', 'configSchema', 'sampleData', 'assetRequirements', 'mobileAdaptations',
        'aiEventHandlers', 'aiResponseActions', 'instanceDataSchema', 'userProgressSchema',
        'mediaConfig', 'videoUrlConfig', 'widgets',
      ];
      for (const k of JSONB_KEYS) {
        if (updateData[k] != null) {
          const s = sanitizeJsonb(updateData[k]);
          if (s === null && updateData[k] !== null) {
            console.warn(`[InteractionTypesController] ⚠️ Failed to sanitize ${k}, omitting`);
            delete updateData[k];
          } else {
            updateData[k] = s;
          }
        }
      }
      
      console.log(`[InteractionTypesController] 📤 Sending keys: ${Object.keys(updateData).join(', ')}`);
      return await this.interactionTypesService.update(id, updateData);
    } catch (error: any) {
      console.error('[InteractionTypesController] ❌ Update error:', error);
      console.error('[InteractionTypesController] Error stack:', error?.stack);
      const msg = error?.message || String(error);
      const detail = error?.detail ? `; detail: ${error.detail}` : '';
      throw new InternalServerErrorException(`Save failed: ${msg}${detail}`);
    }
  }

  @Delete('document/:id')
  async removeDocument(@Param('id') id: string) {
    return this.interactionTypesService.removeDocument(id);
  }
}

