import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmProvider } from '../entities/llm-provider.entity';

export interface GrokRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  lessonContext?: any;
}

export interface GrokResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: string;
}

/**
 * Grok API Service - Uses API key from LlmProvider database table (same as Content Analyzer)
 * 
 * In production, this will call the real xAI Grok API:
 * https://api.x.ai/v1/chat/completions
 */
@Injectable()
export class GrokService {
  private logger = new Logger('GrokService');

  constructor(
    @InjectRepository(LlmProvider)
    private llmProviderRepository: Repository<LlmProvider>,
  ) {}

  /**
   * Send chat completion request to Grok API
   */
  async chatCompletion(request: GrokRequest): Promise<GrokResponse> {
    // Get default LLM provider (same approach as Content Analyzer)
    const provider = await this.llmProviderRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    // Check if we should use mock mode (only if explicitly set AND no provider)
    // If a provider exists, always try to use it (even if API key might be invalid, let it fail naturally)
    const mockMode = process.env.GROK_MOCK_MODE === 'true';
    const hasApiKey = provider?.apiKey && provider.apiKey !== 'mock-grok-key';

    // Only use mock if explicitly set to mock mode
    // Otherwise, always try to use real API if provider exists
    if (mockMode) {
      this.logger.warn(`⚠️ Using mock Grok response - GROK_MOCK_MODE=true (explicitly set)`);
      const mockResponse = this.getMockResponse(request);
      this.logger.warn(`⚠️ Mock response: ${mockResponse.content.substring(0, 100)}...`);
      return mockResponse;
    }

    // If no provider at all, use mock
    if (!provider) {
      this.logger.warn(`⚠️ Using mock Grok response - No provider found in database`);
      this.logger.warn(`⚠️ Check llm_providers table for a provider with is_default=true and is_active=true`);
      const mockResponse = this.getMockResponse(request);
      this.logger.warn(`⚠️ Mock response: ${mockResponse.content.substring(0, 100)}...`);
      return mockResponse;
    }
    
    this.logger.log(`✅ Provider found: ${provider.name} (ID: ${provider.id})`);

    // If provider exists but no valid API key, log warning but still try (will fail and fallback)
    if (!hasApiKey) {
      this.logger.warn(`⚠️ Provider found but no valid API key - attempting API call anyway (will fallback to mock on error)`);
      this.logger.warn(`⚠️ Provider API key status: ${provider.apiKey ? 'exists but invalid' : 'missing'}`);
    } else {
      this.logger.log(`✅ Using real Grok API - Provider: ${provider.name}, Endpoint: ${provider.apiEndpoint}`);
    }

    try {
      const startTime = Date.now();
      
      this.logger.log(`📞 Calling Grok API: ${provider.apiEndpoint} with model ${provider.modelName || 'grok-beta'}`);
      this.logger.log(`📞 Request messages count: ${request.messages.length}`);
      this.logger.log(`📞 Total request size: ~${JSON.stringify(request.messages).length} chars`);
      
      const response = await fetch(provider.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: provider.modelName || 'grok-beta',
          messages: request.messages,
          temperature: request.temperature || parseFloat(provider.temperature as any) || 0.7,
          max_tokens: request.maxTokens || provider.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Grok API HTTP error: ${response.status} ${response.statusText}`);
        this.logger.error(`Grok API error response: ${errorText}`);
        throw new Error(`Grok API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      // Extract response content
      const content = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || 0;
      const finishReason = data.choices?.[0]?.finish_reason || 'stop';

      this.logger.log(`✅ Grok API success: ${tokensUsed} tokens in ${processingTime}ms`);
      this.logger.log(`✅ Response content length: ${content.length} chars`);
      this.logger.log(`✅ Response preview: ${content.substring(0, 150)}...`);

      return {
        content,
        tokensUsed,
        model: data.model || 'grok-beta',
        finishReason,
      };
    } catch (error: any) {
      this.logger.error(`Grok API call failed: ${error.message}`, error.stack);
      // Only fallback to mock if we have no API key - otherwise throw error so user knows
      if (!hasApiKey) {
        this.logger.warn('Falling back to mock response (no valid API key)');
        return this.getMockResponse(request);
      } else {
        // If we have an API key but the call failed, throw the error so it's visible
        this.logger.error(`Grok API call failed with valid API key configured. Error: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Mock Grok API response for development
   */
  private getMockResponse(request: GrokRequest): GrokResponse {
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    const systemPrompt = request.messages.find(m => m.role === 'system')?.content || '';
    
    this.logger.log(`Mock Grok request: "${userMessage.substring(0, 50)}..."`);
    
    // Extract context from lessonContext (which contains settings, code, configSchema, sampleData, testErrors)
    const context = request.lessonContext || {};
    
    const responses = this.generateContextualResponse(userMessage, context, systemPrompt);
    
    // Simulate token usage (between 50-300 tokens)
    const tokensUsed = Math.floor(Math.random() * 250) + 50;
    
    return {
      content: responses,
      tokensUsed,
      model: 'grok-beta-mock',
      finishReason: 'stop',
    };
  }

  /**
   * Generate contextual response based on user message and system prompt
   */
  private generateContextualResponse(message: string, context?: any, systemPrompt?: string): string {
    const messageLower = message.toLowerCase();
    
    // If we have a system prompt, try to generate a more contextual response
    if (systemPrompt) {
      // Check if this is a teacher assistant prompt
      if (systemPrompt.includes('AI Teacher') || systemPrompt.includes('teacher') || systemPrompt.includes('student')) {
        return this.getTeacherResponse(message, systemPrompt, context);
      }
      // Check if this is an interaction builder prompt
      if (systemPrompt.includes('Interaction Builder') || systemPrompt.includes('interaction')) {
        return this.getInteractionBuilderResponse(message, systemPrompt, context);
      }
    }
    
    // Question patterns
    if (messageLower.includes('how')) {
      return this.getHowResponse(message, context);
    } else if (messageLower.includes('why')) {
      return this.getWhyResponse(message, context);
    } else if (messageLower.includes('what')) {
      return this.getWhatResponse(message, context);
    } else if (messageLower.includes('help') || messageLower.includes('stuck')) {
      return this.getHelpResponse(message, context);
    } else if (messageLower.includes('example')) {
      return this.getExampleResponse(message, context);
    }
    
    // Default encouraging response
    return this.getDefaultResponse(message, context);
  }

  /**
   * Generate response for teacher assistant
   * NOTE: This is a MOCK response. Real Grok API calls require a valid API key in the llm_providers table.
   * To use real AI responses, ensure:
   * 1. A provider exists in llm_providers with is_default=true and is_active=true
   * 2. The provider has a valid API key (not 'mock-grok-key')
   * 3. GROK_MOCK_MODE is not set to 'true' in environment variables
   */
  private getTeacherResponse(message: string, systemPrompt: string, context?: any): string {
    const messageLower = message.toLowerCase();
    
    // Add warning that this is a mock response
    const mockWarning = `⚠️ NOTE: This is a MOCK response. To get real AI responses, configure a valid Grok API key in the database.\n\n`;
    
    // Check if lesson data is available in context
    const hasLessonData = context?.lessonData || context?.lessonId;
    
    // Try to provide context-aware responses based on lesson content
    if (hasLessonData && (messageLower.includes('explain') || messageLower.includes('what is'))) {
      return `${mockWarning}Based on the lesson content, I can help explain this concept. The lesson covers important topics that relate to your question. Let me break this down for you in a way that connects to what you're learning.`;
    }
    
    if (messageLower.includes('help') || messageLower.includes('stuck') || messageLower.includes('confused')) {
      return `${mockWarning}I'm here to help! It looks like you might need some guidance. Let me think about how to best explain this based on the lesson material. Can you tell me which part is confusing?`;
    }
    
    if (messageLower.includes('how') || messageLower.includes('do i')) {
      return `${mockWarning}Great question! Based on the lesson, here's how you can approach this. The key steps are: 1) Understand the concept, 2) Apply it to your situation, 3) Practice with examples. Would you like me to elaborate?`;
    }
    
    // Default teacher response
    return `${mockWarning}I understand your question. Based on the lesson content, I can help you understand this better. The lesson covers relevant material that should help answer your question. Would you like me to explain a specific part in more detail?`;
  }

  /**
   * Generate response for interaction builder assistant
   * BRIEF responses only - 2-4 sentences max
   */
  private getInteractionBuilderResponse(message: string, systemPrompt: string, context?: any): string {
    const messageLower = message.toLowerCase();
    
    // Check for test errors first - prioritize fixing them - BRIEF
    if (context?.testErrors) {
      const error = context.testErrors.error || '';
      if (error.includes('typo') || error.includes('class=') || error.includes('id=')) {
        return `Fixing HTML typo in attributes.`;
      }
      if (error.includes('element not found')) {
        return `Adding missing element.`;
      }
      if (error.includes('JSON')) {
        return `Fixing JSON syntax.`;
      }
      return `Fixing error.`;
    }
    
    // Check what the user is asking about - BRIEF responses (1-2 sentences max, no code)
    if (messageLower.includes('config') || messageLower.includes('configurable') || messageLower.includes('field')) {
      return `Adding configurable field to Config Schema.`;
    }
    
    if (messageLower.includes('html') || messageLower.includes('css') || messageLower.includes('javascript')) {
      return `Updating code to use interactionData and interactionConfig.`;
    }
    
    if (messageLower.includes('pixijs') || messageLower.includes('pixi')) {
      return `Updating PixiJS code.`;
    }
    
    if (messageLower.includes('iframe') || messageLower.includes('embed')) {
      return `Configuring iFrame URL field.`;
    }
    
    if (messageLower.includes('sample') || messageLower.includes('preview') || messageLower.includes('test data')) {
      return `Updating sample data format.`;
    }
    
    // Generic brief response
    return `I can help with Settings, Code, Config Schema, or Sample Data. What do you need?`;
  }

  private getHowResponse(message: string, context?: any): string {
    const responses = [
      "Great question! Let me walk you through this step by step:\n\n1. First, you need to understand the basic concept\n2. Then, we apply it to your specific case\n3. Finally, you practice with hands-on examples\n\nWould you like me to elaborate on any of these steps?",
      "I'll explain the process:\n\nThe key is to break it down into manageable parts. Start with the fundamentals, then build upon them progressively. This approach helps you understand not just 'how' but also 'why' it works this way.\n\nDoes this make sense so far?",
      "Let me guide you through this:\n\nThink of it like building blocks. Each concept builds on the previous one. I'll show you the pattern, then you can apply it yourself.\n\nShall we start with the basics?",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getWhyResponse(message: string, context?: any): string {
    const responses = [
      "Excellent question! The reasoning behind this is important:\n\nThis approach is used because it provides several benefits:\n• Better performance and efficiency\n• Easier to understand and maintain\n• Follows industry best practices\n\nWould you like to explore any of these reasons in more detail?",
      "That's a thoughtful question! Here's why:\n\nThe underlying principle is based on how things work at a fundamental level. By understanding the 'why', you'll be able to apply this knowledge in different situations.\n\nDoes this help clarify things?",
      "Great critical thinking! The reason is:\n\nWhen we use this method, we're solving a specific problem that occurs frequently in this field. It's evolved over time as developers discovered better ways to handle these situations.\n\nWould you like some concrete examples?",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getWhatResponse(message: string, context?: any): string {
    const responses = [
      "Let me explain what this is:\n\nThis is a fundamental concept that you'll use frequently. Think of it as a tool in your toolkit - once you understand it, you'll recognize when and how to use it.\n\nWould you like to see how it's applied in practice?",
      "Good question! Here's what this means:\n\nImagine it like this: [concept] is similar to [analogy]. It serves the purpose of [function] and you'll typically use it when [scenario].\n\nDoes this explanation help?",
      "I'm glad you asked! This refers to:\n\nA specific technique that helps you [purpose]. You'll find it useful when working on [use case]. Many developers rely on this because it simplifies [benefit].\n\nShall I show you an example?",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getHelpResponse(message: string, context?: any): string {
    return "I'm here to help! Let's work through this together.\n\nCan you tell me:\n• What step are you on?\n• What have you tried so far?\n• What specific part is confusing?\n\nOnce I know more, I can provide targeted guidance!";
  }

  private getExampleResponse(message: string, context?: any): string {
    return "Absolutely! Examples are a great way to learn. Here's a practical example:\n\n```\n// Example code here\nconst example = 'This demonstrates the concept';\n```\n\nNotice how [key point]? This is the pattern you'll use in your own projects.\n\nWould you like to see another example or try it yourself?";
  }

  private getDefaultResponse(message: string, context?: any): string {
    const responses = [
      "I understand what you're asking. Let me provide some insight:\n\nThis is an important topic that many students find interesting. The key is to approach it systematically and build your understanding gradually.\n\nWhat specific aspect would you like to focus on?",
      "Thanks for your question! Here's my perspective:\n\nThis connects to what we learned earlier. Try to think about how the pieces fit together - that's when the 'aha!' moment happens.\n\nWould you like me to review the previous concept?",
      "Great engagement with the material! Let me respond:\n\nYou're on the right track. Keep asking questions like this - it shows you're thinking critically about the content. That's exactly how deep learning happens.\n\nWhat else would you like to explore?",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

