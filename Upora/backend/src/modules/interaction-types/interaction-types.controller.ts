import { Controller, Get, Param, Post, Put, Body, Headers, Delete, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InteractionTypesService } from './interaction-types.service';
import { CreateInteractionTypeDto, UpdateInteractionTypeDto } from './dto/interaction-type.dto';

@Controller('interaction-types')
export class InteractionTypesController {
  constructor(private readonly interactionTypesService: InteractionTypesService) {}

  @Get()
  async findAll() {
    return this.interactionTypesService.findAll();
  }

  // Specific routes must come before parameterized routes to avoid route conflicts
  @Post('seed')
  async seed() {
    await this.interactionTypesService.seedTrueFalseSelection();
    await this.interactionTypesService.seedVideoUrlInteraction();
    await this.interactionTypesService.seedSDKTestVideoUrlInteraction();
    await this.interactionTypesService.updateSDKTestPixiJSInteraction();
    await this.interactionTypesService.updateSDKTestHTMLInteraction();
    return { message: 'Interaction types seeded successfully' };
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
  async update(
    @Param('id') id: string,
    @Body() dto: any, // Use any for now to avoid DTO validation issues
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    // TODO: Add super-admin role check
    // Remove fields that shouldn't be updated
    const { id: bodyId, createdAt, updatedAt, contentOutputId, ...updateData } = dto;
    // contentOutputId is for interaction instances, not interaction types
    // It's used for testing in the builder but shouldn't be saved to the type
    return this.interactionTypesService.update(id, updateData);
  }

  @Delete('document/:id')
  async removeDocument(@Param('id') id: string) {
    return this.interactionTypesService.removeDocument(id);
  }
}

