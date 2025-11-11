import { Controller, Get, Post, Put, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AiPromptsService } from './ai-prompts.service';
import { AiPrompt } from '../../entities/ai-prompt.entity';

@Controller('ai-prompts')
export class AiPromptsController {
  constructor(private readonly aiPromptsService: AiPromptsService) {}

  @Get()
  async findAll(): Promise<AiPrompt[]> {
    return this.aiPromptsService.findAll();
  }

  @Get('assistant/:assistantId')
  async findByAssistant(@Param('assistantId') assistantId: string): Promise<AiPrompt[]> {
    return this.aiPromptsService.findByAssistant(assistantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AiPrompt | null> {
    return this.aiPromptsService.findOne(id);
  }

  @Put(':id')
  async updateContent(
    @Param('id') id: string,
    @Body('content') content: string,
  ): Promise<AiPrompt> {
    return this.aiPromptsService.updateContent(id, content);
  }

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  async resetToDefault(@Param('id') id: string): Promise<AiPrompt> {
    return this.aiPromptsService.resetToDefault(id);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed(): Promise<{ message: string; count: number }> {
    await this.aiPromptsService.seedDefaultPrompts();
    const all = await this.aiPromptsService.findAll();
    return { message: 'Default prompts seeded successfully', count: all.length };
  }
}

