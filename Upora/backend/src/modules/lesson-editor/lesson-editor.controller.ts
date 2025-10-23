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
} from '@nestjs/common';
import { LessonEditorService } from './lesson-editor.service';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { ScriptBlock } from '../../entities/script-block.entity';

// DTOs
export class CreateProcessedOutputDto {
  lessonId: string;
  contentSourceId?: string;
  workflowId?: string;
  outputName: string;
  outputType: string;
  outputData: any;
  workflowName?: string;
  notes?: string;
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
  async createProcessedOutput(
    @Body() dto: CreateProcessedOutputDto,
  ): Promise<ProcessedContentOutput> {
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
}

