import { Controller, Post, Body, Headers, Get, Param, Query, Delete, Patch } from '@nestjs/common';
import { ImageGeneratorService } from '../../services/image-generator.service';
import { ContentCacheService } from '../../services/content-cache.service';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../../services/image-generator.service';

@Controller('image-generator')
export class ImageGeneratorController {
  constructor(
    private readonly imageGeneratorService: ImageGeneratorService,
    private readonly contentCacheService: ContentCacheService,
  ) {}

  // ─── Troublesome References ────────────────────────────────────

  /** Get all troublesome references for image generation. */
  @Get('troublesome-references')
  async getTroublesomeReferences() {
    return this.imageGeneratorService.getTroublesomeReferences();
  }

  /** Report a movie/TV reference that caused image generation failure. */
  @Post('troublesome-reference')
  async reportTroublesomeReference(@Body() body: { reference: string; reason?: string }) {
    return this.imageGeneratorService.addTroublesomeReference(body.reference, body.reason);
  }

  /** Remove a troublesome reference from the list. */
  @Delete('troublesome-reference/:reference')
  async removeTroublesomeReference(@Param('reference') reference: string) {
    return this.imageGeneratorService.removeTroublesomeReference(decodeURIComponent(reference));
  }

  /** Get the most recent generated images (for admin observability). */
  @Get('recent')
  async getRecentImages(@Query('limit') limit?: string) {
    const max = Math.min(parseInt(limit || '10', 10) || 10, 50);
    return this.imageGeneratorService.getRecentImages(max);
  }

  /** LLM-powered theme selection: pick the best TV show/movie style for content */
  @Post('select-theme')
  async selectBestTheme(
    @Body() body: { contentItems: string[]; contentTitle?: string },
    @Headers('x-user-id') userId?: string,
  ) {
    return this.imageGeneratorService.selectBestTheme(userId || '', body.contentItems || [], body.contentTitle);
  }

  @Post('generate')
  async generateImage(
    @Body() request: ImageGenerationRequest,
    @Headers('x-user-id') userId?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ): Promise<ImageGenerationResponse> {
    return this.imageGeneratorService.generateImage(request, userId, tenantId);
  }

  @Get('lesson/:lessonId')
  async getLessonImages(
    @Param('lessonId') lessonId: string,
    @Query('accountId') accountId?: string,
    @Query('imageId') imageId?: string,
  ) {
    if (imageId) {
      return await this.imageGeneratorService.getImageById(imageId);
    }
    return await this.imageGeneratorService.getLessonImages(lessonId, accountId);
  }

  @Get('lesson/:lessonId/ids')
  async getLessonImageIds(
    @Param('lessonId') lessonId: string,
    @Query('accountId') accountId?: string,
  ) {
    return await this.imageGeneratorService.getLessonImageIds(lessonId, accountId);
  }

  /** Find a cached image pair by interests for personalisation-based lookup */
  @Post('lesson/:lessonId/find-pair')
  async findImagePair(
    @Param('lessonId') lessonId: string,
    @Body() body: { interactionId?: string; interests?: string[]; dictionaryLabel?: string },
  ) {
    const pair = await this.imageGeneratorService.findImagePairsByInterest(
      lessonId,
      body.interactionId || null,
      body.interests || [],
      body.dictionaryLabel,
    );
    return pair ? { found: true, pair } : { found: false };
  }

  /** Look up an image by dictionary label (simple word). */
  @Get('dictionary/:label')
  async findByDictionaryLabel(@Param('label') label: string) {
    const image = await this.contentCacheService.findImageByDictionaryLabel(label);
    if (!image) return { found: false };
    const full = await this.imageGeneratorService.getImageById(image.id);
    return { found: true, image: full };
  }

  /** Add / update dictionary labels on an existing image. */
  @Patch(':imageId/dictionary-labels')
  async updateDictionaryLabels(
    @Param('imageId') imageId: string,
    @Body() body: { labels: string[] },
  ) {
    const normed = (body.labels || []).map(l => l.trim().toLowerCase().replace(/\s+/g, '-')).filter(l => l);
    await this.imageGeneratorService['generatedImageRepository'].update(imageId, { dictionaryLabels: normed });
    return { success: true, labels: normed };
  }

  /** Retrieve the component map for a generated image. */
  @Get(':imageId/component-map')
  async getComponentMap(@Param('imageId') imageId: string) {
    const image = await this.imageGeneratorService.getImageById(imageId);
    if (!image) return { found: false };
    return { found: true, componentMap: image.componentMap || null };
  }

  @Delete(':imageId')
  async deleteImage(
    @Param('imageId') imageId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return await this.imageGeneratorService.deleteImage(imageId, userId, tenantId);
  }
}

