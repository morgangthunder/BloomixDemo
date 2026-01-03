import { Controller, Post, Body, Headers, Get, Param, Query, Delete } from '@nestjs/common';
import { ImageGeneratorService } from '../../services/image-generator.service';
import type { ImageGenerationRequest, ImageGenerationResponse } from '../../services/image-generator.service';

@Controller('image-generator')
export class ImageGeneratorController {
  constructor(private readonly imageGeneratorService: ImageGeneratorService) {}

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
    try {
      // If imageId is provided, return only that image
      if (imageId) {
        return await this.imageGeneratorService.getImageById(imageId);
      }
      return await this.imageGeneratorService.getLessonImages(lessonId, accountId);
    } catch (error: any) {
      console.error('[ImageGeneratorController] Error in getLessonImages:', error);
      throw error;
    }
  }

  @Get('lesson/:lessonId/ids')
  async getLessonImageIds(
    @Param('lessonId') lessonId: string,
    @Query('accountId') accountId?: string,
  ) {
    try {
      return await this.imageGeneratorService.getLessonImageIds(lessonId, accountId);
    } catch (error: any) {
      console.error('[ImageGeneratorController] Error in getLessonImageIds:', error);
      throw error;
    }
  }

  @Delete(':imageId')
  async deleteImage(
    @Param('imageId') imageId: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    try {
      return await this.imageGeneratorService.deleteImage(imageId, userId, tenantId);
    } catch (error: any) {
      console.error('[ImageGeneratorController] Error in deleteImage:', error);
      throw error;
    }
  }
}

