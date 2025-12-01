import { Test, TestingModule } from '@nestjs/testing';
import { InteractionAIContextService } from '../../services/interaction-ai-context.service';
import { AITeacherPromptBuilderService } from '../../services/ai-teacher-prompt-builder.service';
import { InteractionResponseParserService } from '../../services/interaction-response-parser.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { AiPromptsService } from '../ai-prompts/ai-prompts.service';
import { InteractionType } from '../../entities/interaction-type.entity';

describe('Interaction AI SDK Services', () => {
  let contextService: InteractionAIContextService;
  let promptBuilderService: AITeacherPromptBuilderService;
  let responseParserService: InteractionResponseParserService;

  const mockProcessedOutputRepository = {
    findOne: jest.fn(),
  };

  const mockAiPromptsService = {
    findByKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionAIContextService,
        AITeacherPromptBuilderService,
        InteractionResponseParserService,
        {
          provide: getRepositoryToken(ProcessedContentOutput),
          useValue: mockProcessedOutputRepository,
        },
        {
          provide: AiPromptsService,
          useValue: mockAiPromptsService,
        },
      ],
    }).compile();

    contextService = module.get<InteractionAIContextService>(InteractionAIContextService);
    promptBuilderService = module.get<AITeacherPromptBuilderService>(AITeacherPromptBuilderService);
    responseParserService = module.get<InteractionResponseParserService>(InteractionResponseParserService);
  });

  describe('InteractionAIContextService', () => {
    it('should create context for interaction', async () => {
      const context = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      
      expect(context).toBeDefined();
      expect(context.lessonId).toBe('lesson-1');
      expect(context.substageId).toBe('substage-1');
      expect(context.interactionId).toBe('interaction-1');
      expect(context.state).toEqual({});
      expect(context.events).toEqual([]);
    });

    it('should add events to context', async () => {
      const context = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      
      contextService.addEvent(context.id, {
        type: 'user-selection',
        data: { index: 0 },
        requiresLLMResponse: true,
      });
      
      const events = contextService.getRecentEvents(context.id);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('user-selection');
    });

    it('should update state', async () => {
      const context = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      
      contextService.updateState(context.id, { attempts: 3 });
      
      const updatedContext = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      expect(updatedContext.state.attempts).toBe(3);
    });

    it('should accept custom event types', async () => {
      const context = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      
      contextService.addEvent(context.id, {
        type: 'my-custom-event-type',
        data: { custom: 'data' },
        requiresLLMResponse: false,
      });
      
      const events = contextService.getRecentEvents(context.id);
      expect(events[0].type).toBe('my-custom-event-type');
    });
  });

  describe('AITeacherPromptBuilderService', () => {
    it('should build prompt with three layers', async () => {
      mockAiPromptsService.findByKey.mockResolvedValue({
        content: 'Base system prompt',
      });

      const interactionType: Partial<InteractionType> = {
        id: 'true-false-selection',
        name: 'True/False Selection',
        description: 'Test interaction',
        aiPromptTemplate: 'Custom builder prompt',
      };

      const context = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      context.state = { attempts: 2 };
      context.processedContent = { fragments: [] };

      const prompt = await promptBuilderService.buildPrompt(
        interactionType as InteractionType,
        context,
      );

      expect(prompt).toContain('Base system prompt');
      expect(prompt).toContain('True/False Selection');
      expect(prompt).toContain('Custom builder prompt');
    });

    it('should format processed content in prompt', async () => {
      mockAiPromptsService.findByKey.mockResolvedValue({
        content: 'Base prompt',
      });

      const interactionType: Partial<InteractionType> = {
        id: 'test',
        name: 'Test',
        description: 'Test',
      };

      const context = await contextService.getContext('lesson-1', 'substage-1', 'interaction-1');
      context.processedContent = { fragments: [{ text: 'Test fragment' }] };

      const prompt = await promptBuilderService.buildPrompt(
        interactionType as InteractionType,
        context,
      );

      expect(prompt).toContain('Test fragment');
    });
  });

  describe('InteractionResponseParserService', () => {
    it('should parse JSON response', () => {
      const jsonResponse = '```json\n{"response": "Great job!", "actions": [{"type": "highlight", "target": "0"}]}\n```';
      
      const parsed = responseParserService.parseResponse(jsonResponse);
      
      expect(parsed.response).toBe('Great job!');
      expect(parsed.actions).toBeDefined();
      expect(parsed.actions?.[0].type).toBe('highlight');
    });

    it('should parse text-only response', () => {
      const textResponse = 'Great job! Keep going!';
      
      const parsed = responseParserService.parseResponse(textResponse);
      
      expect(parsed.response).toBe('Great job! Keep going!');
      expect(parsed.actions).toBeUndefined();
    });

    it('should validate response structure', () => {
      const validResponse = {
        response: 'Test',
        actions: [{ type: 'highlight', target: '0', data: {} }],
      };
      
      expect(responseParserService.validateResponse(validResponse)).toBe(true);
    });

    it('should reject invalid response structure', () => {
      const invalidResponse = {
        response: null,
      };
      
      expect(responseParserService.validateResponse(invalidResponse as any)).toBe(false);
    });
  });
});


