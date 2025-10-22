import { Injectable, Logger } from '@nestjs/common';

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
 * Grok API Service - Mock implementation for MVP
 * 
 * In production, this will call the real xAI Grok API:
 * https://api.x.ai/v1/chat/completions
 */
@Injectable()
export class GrokService {
  private logger = new Logger('GrokService');
  private readonly mockMode = process.env.GROK_MOCK_MODE !== 'false';
  private readonly apiKey = process.env.GROK_API_KEY;
  private readonly apiUrl = process.env.GROK_API_URL || 'https://api.x.ai/v1';

  /**
   * Send chat completion request to Grok API
   * Currently mocked for MVP
   */
  async chatCompletion(request: GrokRequest): Promise<GrokResponse> {
    if (this.mockMode) {
      return this.getMockResponse(request);
    }

    // TODO: Implement real Grok API call for production
    // const response = await fetch(`${this.apiUrl}/chat/completions`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'grok-beta',
    //     messages: request.messages,
    //     temperature: request.temperature || 0.7,
    //     max_tokens: request.maxTokens || 1000,
    //   }),
    // });

    return this.getMockResponse(request);
  }

  /**
   * Mock Grok API response for development
   */
  private getMockResponse(request: GrokRequest): GrokResponse {
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    
    this.logger.log(`Mock Grok request: "${userMessage.substring(0, 50)}..."`);
    
    const responses = this.generateContextualResponse(userMessage, request.lessonContext);
    
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
   * Generate contextual response based on user message
   */
  private generateContextualResponse(message: string, context?: any): string {
    const messageLower = message.toLowerCase();
    
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

