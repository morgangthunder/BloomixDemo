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
    @Body('label') label?: string,
  ): Promise<AiPrompt> {
    // Parse ID to get assistant and prompt key
    const [assistantId, promptKey] = id.split('.');
    
    if (!assistantId || !promptKey) {
      throw new Error(`Invalid prompt ID format: ${id}. Expected format: assistantId.promptKey`);
    }

    // Use upsert to create if not exists, update if exists
    return this.aiPromptsService.upsert(
      assistantId,
      promptKey,
      label || promptKey, // Use provided label or fall back to promptKey
      content,
      content, // Use same content as default for new prompts
    );
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

