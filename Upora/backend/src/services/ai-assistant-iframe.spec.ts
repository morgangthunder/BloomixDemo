import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAssistantService } from './ai-assistant.service';
import { GrokService } from './grok.service';
import { AiPromptsService } from '../modules/ai-prompts/ai-prompts.service';
import { WeaviateService } from './weaviate.service';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { User } from '../entities/user.entity';

describe('AiAssistantService - Iframe Screenshot Integration', () => {
  let service: AiAssistantService;
  let grokService: jest.Mocked<GrokService>;
  let aiPromptsService: jest.Mocked<AiPromptsService>;
  let weaviateService: jest.Mocked<WeaviateService>;
  let processedOutputRepository: jest.Mocked<Repository<ProcessedContentOutput>>;

  const mockUser: User = {
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
  } as User;

  const mockIframeScreenshotPrompt: AiPrompt = {
    id: 'teacher.iframe-screenshot',
    assistantId: 'teacher',
    promptKey: 'iframe-screenshot',
    label: 'IFrame Screenshot Prompt',
    content: 'You are analyzing a screenshot of an iframed website...',
    defaultContent: 'You are analyzing a screenshot...',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLessonData = {
    id: 'lesson-123',
    title: 'Test Lesson',
    stages: [
      {
        id: 'stage-1',
        title: 'Introduction',
        subStages: [
          {
            id: 'substage-1',
            title: 'Getting Started',
            interaction: {
              type: 'iframe',
              interactionTypeId: 'test-iframe-interaction',
              config: {
                iframeUrl: 'https://example.com/embed',
                screenshotTriggers: {
                  iframeLoad: true,
                  scriptBlockComplete: true,
                },
              },
            },
          },
        ],
      },
    ],
  };

  const mockRelevantContent = [
    {
      id: 'content-1',
      contentSourceId: 'source-1',
      summary: 'Test content summary',
      relevanceScore: 0.95,
    },
  ];

  beforeEach(async () => {
    const mockGrokService = {
      chatCompletion: jest.fn(),
    };

    const mockAiPromptsService = {
      findByKey: jest.fn(),
    };

    const mockWeaviateService = {
      searchByContentSourceIds: jest.fn(),
    };

    const mockProcessedOutputRepository = {
      find: jest.fn(),
    };

    const mockLlmLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAssistantService,
        {
          provide: GrokService,
          useValue: mockGrokService,
        },
        {
          provide: AiPromptsService,
          useValue: mockAiPromptsService,
        },
        {
          provide: WeaviateService,
          useValue: mockWeaviateService,
        },
        {
          provide: getRepositoryToken(ProcessedContentOutput),
          useValue: mockProcessedOutputRepository,
        },
        {
          provide: getRepositoryToken(LlmGenerationLog),
          useValue: mockLlmLogRepository,
        },
      ],
    }).compile();

    service = module.get<AiAssistantService>(AiAssistantService);
    grokService = module.get(GrokService);
    aiPromptsService = module.get(AiPromptsService);
    weaviateService = module.get(WeaviateService);
    processedOutputRepository = module.get(getRepositoryToken(ProcessedContentOutput));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('iframe screenshot handling', () => {
    it('should process iframe screenshot with document and lesson context', async () => {
      const screenshotBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const documentContent = 'This is a reference document about the lesson topic.';
      const triggerEvent = 'iframeLoad';

      // Mock prompt retrieval
      aiPromptsService.findByKey.mockResolvedValue(mockIframeScreenshotPrompt);

      // Mock Weaviate search
      processedOutputRepository.find.mockResolvedValue([
        { contentSourceId: 'source-1' } as ProcessedContentOutput,
      ]);
      weaviateService.searchByContentSourceIds.mockResolvedValue(mockRelevantContent);

      // Mock Grok response
      grokService.chatCompletion.mockResolvedValue({
        content: 'I can see the iframe has loaded. Please proceed with the first step.',
        tokensUsed: 150,
      });

      const result = await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'iframe-screenshot',
          userMessage: 'Screenshot captured',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            screenshot: screenshotBase64,
            documentContent: documentContent,
            triggerEvent: triggerEvent,
          },
          conversationHistory: [],
        },
        mockUser,
      );

      expect(aiPromptsService.findByKey).toHaveBeenCalledWith('teacher', 'iframe-screenshot');
      expect(weaviateService.searchByContentSourceIds).toHaveBeenCalled();
      expect(grokService.chatCompletion).toHaveBeenCalled();
      
      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      expect(grokCall.messages[0].content).toContain('analyzing a screenshot of an iframed website');
      expect(grokCall.messages[grokCall.messages.length - 1].content).toContain('SCREENSHOT');
      expect(grokCall.messages[grokCall.messages.length - 1].content).toContain(triggerEvent);
      
      expect(result.content).toContain('iframe has loaded');
    });

    it('should include document content when provided', async () => {
      const screenshotBase64 = 'data:image/png;base64,test';
      const documentContent = 'Reference document content here.';

      aiPromptsService.findByKey.mockResolvedValue(mockIframeScreenshotPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'iframe-screenshot',
          userMessage: 'Screenshot',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            screenshot: screenshotBase64,
            documentContent: documentContent,
            triggerEvent: 'scriptBlockComplete',
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;
      expect(lastMessage).toContain('REFERENCE DOCUMENT');
      expect(lastMessage).toContain(documentContent);
    });

    it('should handle different trigger events', async () => {
      const triggers = ['iframeLoad', 'iframeUrlChange', 'postMessage', 'scriptBlockComplete', 'periodic'];

      aiPromptsService.findByKey.mockResolvedValue(mockIframeScreenshotPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Response',
        tokensUsed: 100,
      });

      for (const trigger of triggers) {
        await service.chat(
          {
            assistantId: 'teacher',
            promptKey: 'iframe-screenshot',
            userMessage: 'Screenshot',
            context: {
              lessonId: 'lesson-123',
              lessonData: mockLessonData,
              screenshot: 'data:image/png;base64,test',
              triggerEvent: trigger,
            },
            conversationHistory: [],
          },
          mockUser,
        );

        const grokCall = grokService.chatCompletion.mock.calls[grokService.chatCompletion.mock.calls.length - 1][0];
        const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;
        expect(lastMessage).toContain(trigger);
      }
    });

    it('should include lesson data in context', async () => {
      aiPromptsService.findByKey.mockResolvedValue(mockIframeScreenshotPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'iframe-screenshot',
          userMessage: 'Screenshot',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            screenshot: 'data:image/png;base64,test',
            triggerEvent: 'iframeLoad',
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;
      expect(lastMessage).toContain('LESSON DATA');
      expect(lastMessage).toContain('Test Lesson');
    });

    it('should include Weaviate search results when available', async () => {
      aiPromptsService.findByKey.mockResolvedValue(mockIframeScreenshotPrompt);
      processedOutputRepository.find.mockResolvedValue([
        { contentSourceId: 'source-1' } as ProcessedContentOutput,
      ]);
      weaviateService.searchByContentSourceIds.mockResolvedValue(mockRelevantContent);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'iframe-screenshot',
          userMessage: 'Screenshot',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            screenshot: 'data:image/png;base64,test',
            triggerEvent: 'iframeLoad',
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;
      expect(lastMessage).toContain('RELEVANT CONTENT CHUNKS');
      expect(lastMessage).toContain('Test content summary');
    });
  });
});

