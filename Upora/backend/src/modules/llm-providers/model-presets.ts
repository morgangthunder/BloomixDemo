export interface ModelPreset {
  modelName: string;
  displayName: string;
  costPerMillionTokens: number;
  maxTokens: number;
  defaultTemperature: number;
  supportsStreaming?: boolean;
  supportsVision?: boolean;
  contextWindow?: number;
}

export interface ProviderPresets {
  providerType: string;
  displayName: string;
  defaultEndpoint: string;
  models: ModelPreset[];
}

export const MODEL_PRESETS: ProviderPresets[] = [
  {
    providerType: 'xai',
    displayName: 'xAI',
    defaultEndpoint: 'https://api.x.ai/v1/chat/completions',
    models: [
      {
        modelName: 'grok-beta',
        displayName: 'Grok Beta',
        costPerMillionTokens: 5.0,
        maxTokens: 131072,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: false,
        contextWindow: 131072,
      },
      {
        modelName: 'grok-2-1212',
        displayName: 'Grok 2 (Dec 2024)',
        costPerMillionTokens: 2.0,
        maxTokens: 131072,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 131072,
      },
      {
        modelName: 'grok-2-vision-1212',
        displayName: 'Grok 2 Vision (Dec 2024)',
        costPerMillionTokens: 2.0,
        maxTokens: 32768,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 32768,
      },
      {
        modelName: 'grok-3-mini',
        displayName: 'Grok 3 Mini',
        costPerMillionTokens: 0.30,
        maxTokens: 128000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: false,
        contextWindow: 128000,
      },
    ],
  },
  {
    providerType: 'openai',
    displayName: 'OpenAI',
    defaultEndpoint: 'https://api.openai.com/v1/chat/completions',
    models: [
      {
        modelName: 'gpt-4-turbo',
        displayName: 'GPT-4 Turbo',
        costPerMillionTokens: 10.0,
        maxTokens: 128000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 128000,
      },
      {
        modelName: 'gpt-4o',
        displayName: 'GPT-4o',
        costPerMillionTokens: 2.5,
        maxTokens: 128000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 128000,
      },
      {
        modelName: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        costPerMillionTokens: 0.15,
        maxTokens: 128000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 128000,
      },
      {
        modelName: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        costPerMillionTokens: 0.5,
        maxTokens: 16385,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: false,
        contextWindow: 16385,
      },
    ],
  },
  {
    providerType: 'anthropic',
    displayName: 'Anthropic',
    defaultEndpoint: 'https://api.anthropic.com/v1/messages',
    models: [
      {
        modelName: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        costPerMillionTokens: 3.0,
        maxTokens: 200000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 200000,
      },
      {
        modelName: 'claude-3-opus-20240229',
        displayName: 'Claude 3 Opus',
        costPerMillionTokens: 15.0,
        maxTokens: 200000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 200000,
      },
      {
        modelName: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        costPerMillionTokens: 0.25,
        maxTokens: 200000,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 200000,
      },
    ],
  },
  {
    providerType: 'google',
    displayName: 'Google',
    defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: [
      {
        modelName: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        costPerMillionTokens: 1.25,
        maxTokens: 2097152,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 2097152,
      },
      {
        modelName: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        costPerMillionTokens: 0.075,
        maxTokens: 1048576,
        defaultTemperature: 0.7,
        supportsStreaming: true,
        supportsVision: true,
        contextWindow: 1048576,
      },
    ],
  },
];

export function getProviderPresets(providerType: string): ProviderPresets | null {
  return MODEL_PRESETS.find(p => p.providerType === providerType) || null;
}

export function getModelPreset(providerType: string, modelName: string): ModelPreset | null {
  const provider = getProviderPresets(providerType);
  if (!provider) return null;
  return provider.models.find(m => m.modelName === modelName) || null;
}

export function getAllProviderTypes(): string[] {
  return MODEL_PRESETS.map(p => p.providerType);
}

