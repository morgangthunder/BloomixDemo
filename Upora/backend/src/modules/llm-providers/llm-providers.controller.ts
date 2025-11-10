import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Controller('super-admin/llm-providers')
export class LlmProvidersController {
  constructor(private readonly llmProvidersService: LlmProvidersService) {}

  @Get()
  async findAll(): Promise<LlmProvider[]> {
    return this.llmProvidersService.findAll();
  }

  @Get('default')
  async getDefault(): Promise<LlmProvider | null> {
    return this.llmProvidersService.getDefault();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LlmProvider> {
    return this.llmProvidersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: Partial<LlmProvider>): Promise<LlmProvider> {
    return this.llmProvidersService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: Partial<LlmProvider>,
  ): Promise<LlmProvider> {
    return this.llmProvidersService.update(id, data);
  }

  @Put(':id/set-default')
  async setDefault(@Param('id', ParseUUIDPipe) id: string): Promise<LlmProvider> {
    return this.llmProvidersService.setDefault(id);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async testConnection(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: boolean; message: string }> {
    return this.llmProvidersService.testConnection(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.llmProvidersService.delete(id);
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed(): Promise<{ message: string }> {
    await this.llmProvidersService.seedDefaultProvider();
    return { message: 'Default provider seeded successfully' };
  }
}

