import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsString, IsOptional, IsNumber, IsObject, IsUUID } from 'class-validator';
import { LessonEditorService } from './lesson-editor.service';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { ScriptBlock } from '../../entities/script-block.entity';
import type { LessonDataSchema, ProcessedContentData } from '../../services/lesson-data.service';

// DTOs
export class CreateProcessedOutputDto {
  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsOptional()
  @IsString()
  contentSourceId?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsOptional()
  @IsString()
  outputName?: string;

  @IsOptional()
  @IsString()
  outputType?: string;

  @IsOptional()
  @IsObject()
  outputData?: any;

  @IsOptional()
  @IsString()
  workflowName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // YouTube-specific fields
  @IsOptional()
  @IsString()
  videoId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  transcript?: string;

  @IsOptional()
  @IsNumber()
  startTime?: number;

  @IsOptional()
  @IsNumber()
  endTime?: number;

  @IsOptional()
  @IsNumber()
  validationScore?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateProcessedOutputDto {
  outputName?: string;
  outputType?: string;
  outputData?: any;
  workflowName?: string;
  notes?: string;
}

export class CreateScriptBlockDto {
  lessonId: string;
  substageId: string;
  blockType: string;
  content?: string;
  startTime: number;
  endTime: number;
  metadata?: any;
  sequenceOrder?: number;
}

export class UpdateScriptBlockDto {
  blockType?: string;
  content?: string;
  startTime?: number;
  endTime?: number;
  metadata?: any;
  sequenceOrder?: number;
}

export class ReorderScriptBlocksDto {
  blocks: Array<{ id: string; sequenceOrder: number }>;
}

@Controller('lesson-editor')
export class LessonEditorController {
  constructor(private readonly lessonEditorService: LessonEditorService) {}

  // ========== Processed Content Outputs ==========

  @Get('lessons/:lessonId/processed-outputs')
  async getProcessedOutputs(
    @Param('lessonId') lessonId: string,
  ): Promise<ProcessedContentOutput[]> {
    return this.lessonEditorService.getProcessedOutputs(lessonId);
  }

  @Get('processed-outputs/:id')
  async getProcessedOutput(
    @Param('id') id: string,
  ): Promise<ProcessedContentOutput> {
    return this.lessonEditorService.getProcessedOutput(id);
  }

  @Post('processed-outputs')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false }))
  async createProcessedOutput(
    @Body() dto: CreateProcessedOutputDto,
  ): Promise<ProcessedContentOutput> {
    console.log('[LessonEditorController] 📥 Received DTO:', JSON.stringify(dto, null, 2));
    console.log('[LessonEditorController] 🔍 lessonId type:', typeof dto.lessonId, 'value:', dto.lessonId);
    console.log('[LessonEditorController] 🔍 createdBy type:', typeof dto.createdBy, 'value:', dto.createdBy);
    return this.lessonEditorService.createProcessedOutput(dto);
  }

  @Patch('processed-outputs/:id')
  async updateProcessedOutput(
    @Param('id') id: string,
    @Body() dto: UpdateProcessedOutputDto,
  ): Promise<ProcessedContentOutput> {
    return this.lessonEditorService.updateProcessedOutput(id, dto);
  }

  @Delete('processed-outputs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProcessedOutput(@Param('id') id: string): Promise<void> {
    return this.lessonEditorService.deleteProcessedOutput(id);
  }

  // ========== Script Blocks ==========

  @Get('lessons/:lessonId/script/:substageId')
  async getScriptBlocks(
    @Param('lessonId') lessonId: string,
    @Param('substageId') substageId: string,
  ): Promise<ScriptBlock[]> {
    return this.lessonEditorService.getScriptBlocks(lessonId, substageId);
  }

  @Get('script-blocks/:id')
  async getScriptBlock(@Param('id') id: string): Promise<ScriptBlock> {
    return this.lessonEditorService.getScriptBlock(id);
  }

  @Post('script-blocks')
  async createScriptBlock(
    @Body() dto: CreateScriptBlockDto,
  ): Promise<ScriptBlock> {
    return this.lessonEditorService.createScriptBlock(dto);
  }

  @Patch('script-blocks/:id')
  async updateScriptBlock(
    @Param('id') id: string,
    @Body() dto: UpdateScriptBlockDto,
  ): Promise<ScriptBlock> {
    return this.lessonEditorService.updateScriptBlock(id, dto);
  }

  @Delete('script-blocks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScriptBlock(@Param('id') id: string): Promise<void> {
    return this.lessonEditorService.deleteScriptBlock(id);
  }

  @Post('lessons/:lessonId/script/:substageId/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorderScriptBlocks(
    @Param('lessonId') lessonId: string,
    @Param('substageId') substageId: string,
    @Body() dto: ReorderScriptBlocksDto,
  ): Promise<void> {
    return this.lessonEditorService.reorderScriptBlocks(
      lessonId,
      substageId,
      dto.blocks,
    );
  }

  // ========== Lesson Structure Management ==========

  @Patch('lessons/:lessonId/stages')
  async updateLessonStages(
    @Param('lessonId') lessonId: string,
    @Body() stagesData: any,
  ) {
    return this.lessonEditorService.updateLessonStages(lessonId, stagesData);
  }

  // ========== Comprehensive Lesson Data Management ==========

  @Get('lessons/:lessonId/data')
  async getLessonData(
    @Param('lessonId') lessonId: string,
  ): Promise<LessonDataSchema> {
    return this.lessonEditorService.getLessonData(lessonId);
  }

  @Patch('lessons/:lessonId/data')
  async updateLessonData(
    @Param('lessonId') lessonId: string,
    @Body() lessonData: LessonDataSchema,
  ) {
    return this.lessonEditorService.updateLessonData(lessonId, lessonData);
  }

  @Post('lessons/:lessonId/processed-content')
  async addProcessedContent(
    @Param('lessonId') lessonId: string,
    @Body() processedContent: ProcessedContentData,
  ) {
    return this.lessonEditorService.addProcessedContent(lessonId, processedContent);
  }

  @Delete('lessons/:lessonId/processed-content/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeProcessedContent(
    @Param('lessonId') lessonId: string,
    @Param('contentId') contentId: string,
  ): Promise<void> {
    await this.lessonEditorService.removeProcessedContent(lessonId, contentId);
  }

  @Get('lessons/:lessonId/validate-content/:contentId')
  async validateContentForInteraction(
    @Param('lessonId') lessonId: string,
    @Param('contentId') contentId: string,
    @Query('interactionType') interactionType: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    return this.lessonEditorService.validateContentForInteraction(
      lessonId,
      contentId,
      interactionType,
    );
  }

  // ========== Interaction Types Management ==========

  @Get('interaction-types')
  async getInteractionTypes() {
    return this.lessonEditorService.getInteractionTypes();
  }

  @Post('interaction-types')
  async addInteractionType(@Body() interactionType: any) {
    return this.lessonEditorService.addInteractionType(interactionType);
  }

  @Delete('interaction-types/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInteractionType(@Param('id') id: string): Promise<void> {
    return this.lessonEditorService.removeInteractionType(id);
  }
}

