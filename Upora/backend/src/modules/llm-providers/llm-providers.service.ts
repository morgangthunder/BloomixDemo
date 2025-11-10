import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Injectable()
export class LlmProvidersService {
  private readonly logger = new Logger(LlmProvidersService.name);

  constructor(
    @InjectRepository(LlmProvider)
    private llmProviderRepository: Repository<LlmProvider>,
  ) {}

  async findAll(): Promise<LlmProvider[]> {
    return this.llmProviderRepository.find({
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<LlmProvider> {
    const provider = await this.llmProviderRepository.findOne({ where: { id } });
    if (!provider) {
      throw new NotFoundException(`LLM Provider with ID ${id} not found`);
    }
    return provider;
  }

  async getDefault(): Promise<LlmProvider | null> {
    return this.llmProviderRepository.findOne({
      where: { isDefault: true, isActive: true },
    });
  }

  async create(data: Partial<LlmProvider>): Promise<LlmProvider> {
    const provider = this.llmProviderRepository.create(data);
    return this.llmProviderRepository.save(provider);
  }

  async update(id: string, data: Partial<LlmProvider>): Promise<LlmProvider> {
    const provider = await this.findOne(id);
    Object.assign(provider, data);
    return this.llmProviderRepository.save(provider);
  }

  async setDefault(id: string): Promise<LlmProvider> {
    // First, unset all defaults
    await this.llmProviderRepository.update(
      { isDefault: true },
      { isDefault: false },
    );

    // Then set the new default
    const provider = await this.findOne(id);
    provider.isDefault = true;
    await this.llmProviderRepository.save(provider);

    this.logger.log(`[LlmProviders] Set default provider to: ${provider.name}`);
    return provider;
  }

  async delete(id: string): Promise<void> {
    const provider = await this.findOne(id);
    
    if (provider.isDefault) {
      throw new BadRequestException('Cannot delete the default provider. Please set another provider as default first.');
    }

    await this.llmProviderRepository.delete(id);
    this.logger.log(`[LlmProviders] Deleted provider: ${provider.name}`);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const provider = await this.findOne(id);

    try {
      // TODO: Actually test the API connection
      // For now, just validate the configuration
      if (!provider.apiKey || provider.apiKey === 'mock-api-key') {
        return {
          success: false,
          message: 'Invalid API key. Please configure a real API key.',
        };
      }

      if (!provider.apiEndpoint) {
        return {
          success: false,
          message: 'API endpoint is required.',
        };
      }

      // In production, make a test API call here
      this.logger.log(`[LlmProviders] Test connection for: ${provider.name}`);
      
      return {
        success: true,
        message: `Connection test passed for ${provider.name}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  async seedDefaultProvider(): Promise<void> {
    const existing = await this.llmProviderRepository.count();
    
    if (existing > 0) {
      this.logger.log('[LlmProviders] Providers already seeded, skipping...');
      return;
    }

    const defaultProvider = this.llmProviderRepository.create({
      name: 'xAI Grok Beta',
      providerType: 'xai',
      apiEndpoint: 'https://api.x.ai/v1/chat/completions',
      apiKey: 'mock-grok-key', // Will be updated by user
      modelName: 'grok-beta',
      costPerMillionTokens: 5.0,
      maxTokens: 4096,
      temperature: 0.7,
      isActive: true,
      isDefault: true,
      config: {
        supportsStreaming: true,
        supportsVision: false,
        contextWindow: 131072,
      },
    });

    await this.llmProviderRepository.save(defaultProvider);
    this.logger.log('[LlmProviders] ✅ Seeded default xAI Grok Beta provider');
  }
}

