import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { LlmProvidersService } from './llm-providers.service';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { MODEL_PRESETS, getProviderPresets, getModelPreset } from './model-presets';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('super-admin/llm-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin')
export class LlmProvidersController {
  constructor(private readonly llmProvidersService: LlmProvidersService) {}

  // IMPORTANT: Specific routes (like 'presets', 'default', 'seed') must come BEFORE :id routes

  @Get('presets')
  async getPresets() {
    return MODEL_PRESETS;
  }

  @Get('presets/:providerType/:modelName')
  async getModelPreset(
    @Param('providerType') providerType: string,
    @Param('modelName') modelName: string,
  ) {
    const preset = getModelPreset(providerType, modelName);
    if (!preset) {
      return { error: 'Model not found' };
    }
    return preset;
  }

  @Get('presets/:providerType')
  async getProviderPresets(@Param('providerType') providerType: string) {
    const presets = getProviderPresets(providerType);
    if (!presets) {
      return { error: 'Provider type not found' };
    }
    return presets;
  }

  @Get('default')
  async getDefault(): Promise<LlmProvider | null> {
    return this.llmProvidersService.getDefault();
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed(): Promise<{ message: string }> {
    await this.llmProvidersService.seedDefaultProvider();
    return { message: 'Default provider seeded successfully' };
  }

  @Get()
  async findAll(): Promise<LlmProvider[]> {
    return this.llmProvidersService.findAll();
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
}

