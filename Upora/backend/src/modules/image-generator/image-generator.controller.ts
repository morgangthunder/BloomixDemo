import { Controller, Post, Body, Headers } from '@nestjs/common';
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
}

