import { Injectable, Logger } from '@nestjs/common';

/**
 * Response Action - Actions that can be executed in the interaction
 */
export interface ResponseAction {
  type: string; // 'highlight', 'show-hint', 'update-ui', 'play-sound', 'custom', etc.
  target: string; // Element ID, fragment index, etc.
  data: any;
}

/**
 * LLM Response - Structured response from AI Teacher
 */
export interface LLMResponse {
  response: string; // Main text response
  actions?: ResponseAction[];
  stateUpdates?: Record<string, any>;
  metadata?: {
    confidence?: number;
    suggestedNextStep?: string;
  };
}

/**
 * Interaction Response Parser Service
 * Parses LLM responses into structured format for interactions
 */
@Injectable()
export class InteractionResponseParserService {
  private readonly logger = new Logger(InteractionResponseParserService.name);

  /**
   * Parse LLM response text into structured format
   * Attempts to extract JSON structure if present, otherwise uses text as response
   */
  parseResponse(llmResponseText: string): LLMResponse {
    try {
      // Try to parse as JSON first
      const jsonMatch = llmResponseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonContent = JSON.parse(jsonMatch[1]);
        return this.validateAndFormatResponse(jsonContent);
      }
      
      // Try to find JSON object directly
      const jsonObjectMatch = llmResponseText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          const jsonContent = JSON.parse(jsonObjectMatch[0]);
          return this.validateAndFormatResponse(jsonContent);
        } catch (e) {
          // Not valid JSON, continue to text parsing
        }
      }
      
      // If no JSON found, treat entire response as text
      return {
        response: llmResponseText.trim(),
      };
    } catch (error) {
      this.logger.warn('Error parsing LLM response, using text fallback:', error);
      return {
        response: llmResponseText.trim(),
      };
    }
  }

  /**
   * Validate and format parsed JSON response
   */
  private validateAndFormatResponse(parsed: any): LLMResponse {
    const response: LLMResponse = {
      response: parsed.response || parsed.text || parsed.message || '',
    };
    
    // Extract actions if present
    if (parsed.actions && Array.isArray(parsed.actions)) {
      response.actions = parsed.actions.map((action: any) => ({
        type: action.type || 'custom',
        target: action.target || '',
        data: action.data || {},
      }));
    }
    
    // Extract state updates if present
    if (parsed.stateUpdates || parsed.state_updates) {
      response.stateUpdates = parsed.stateUpdates || parsed.state_updates;
    }
    
    // Extract metadata if present
    if (parsed.metadata) {
      response.metadata = {
        confidence: parsed.metadata.confidence,
        suggestedNextStep: parsed.metadata.suggestedNextStep || parsed.metadata.suggested_next_step,
      };
    }
    
    // Ensure response text is not empty
    if (!response.response) {
      response.response = 'I understand. Let me help you with that.';
    }
    
    return response;
  }

  /**
   * Validate response structure
   */
  validateResponse(response: LLMResponse): boolean {
    if (!response.response || typeof response.response !== 'string') {
      return false;
    }
    
    if (response.actions) {
      for (const action of response.actions) {
        if (!action.type || typeof action.type !== 'string') {
          return false;
        }
      }
    }
    
    return true;
  }
}


