import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAssistantService } from './ai-assistant.service';
import { GrokService } from './grok.service';
import { AiPromptsService } from '../modules/ai-prompts/ai-prompts.service';
import { WeaviateService } from './weaviate.service';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { User } from '../entities/user.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

describe('AiAssistantService - Stage/Sub-Stage Context', () => {
  let service: AiAssistantService;
  let grokService: jest.Mocked<GrokService>;
  let aiPromptsService: jest.Mocked<AiPromptsService>;
  let weaviateService: jest.Mocked<WeaviateService>;
  let processedOutputRepository: jest.Mocked<Repository<ProcessedContentOutput>>;

  const mockUser: User = {
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
  } as User;

  const mockTeacherPrompt: AiPrompt = {
    id: 'teacher.general',
    assistantId: 'teacher',
    promptKey: 'general',
    label: 'AI Teacher General Prompt',
    content: 'You are an AI Teacher assistant helping students learn through interactive lessons.',
    defaultContent: 'You are an AI Teacher assistant...',
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
        title: 'Introduction Stage',
        type: 'tease',
        subStages: [
          {
            id: 'substage-1',
            title: 'Getting Started',
            type: 'content',
          },
        ],
      },
    ],
  };

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

  describe('Stage/Sub-Stage Context Inclusion', () => {
    it('should include current stage and sub-stage information in teacher assistant queries', async () => {
      const currentStageInfo = {
        stageId: 'stage-1',
        subStageId: 'substage-1',
        stage: {
          id: 'stage-1',
          title: 'Introduction Stage',
          type: 'tease',
        },
        subStage: {
          id: 'substage-1',
          title: 'Getting Started',
          type: 'content',
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Test response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'general',
          userMessage: 'What should I do next?',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            currentStageInfo: currentStageInfo,
          },
          conversationHistory: [],
        },
        mockUser,
      );

      expect(grokService.chatCompletion).toHaveBeenCalled();
      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;

      // Verify stage/sub-stage context is included
      expect(lastMessage).toContain('=== CURRENT STAGE AND SUB-STAGE ===');
      expect(lastMessage).toContain('Stage: Introduction Stage (tease)');
      expect(lastMessage).toContain('Sub-Stage: Getting Started (content)');
      expect(lastMessage).toContain('The student is currently viewing this stage/sub-stage in the lesson');
    });

    it('should include stage information even when sub-stage is not provided', async () => {
      const currentStageInfo = {
        stageId: 'stage-1',
        subStageId: null,
        stage: {
          id: 'stage-1',
          title: 'Introduction Stage',
          type: 'tease',
        },
        subStage: null,
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Test response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'general',
          userMessage: 'What should I do next?',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            currentStageInfo: currentStageInfo,
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;

      expect(lastMessage).toContain('=== CURRENT STAGE AND SUB-STAGE ===');
      expect(lastMessage).toContain('Stage: Introduction Stage (tease)');
      expect(lastMessage).not.toContain('Sub-Stage:');
    });

    it('should include stage information without type when type is not provided', async () => {
      const currentStageInfo = {
        stageId: 'stage-1',
        subStageId: 'substage-1',
        stage: {
          id: 'stage-1',
          title: 'Introduction Stage',
        },
        subStage: {
          id: 'substage-1',
          title: 'Getting Started',
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Test response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'general',
          userMessage: 'What should I do next?',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            currentStageInfo: currentStageInfo,
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;

      expect(lastMessage).toContain('Stage: Introduction Stage');
      expect(lastMessage).not.toContain('Stage: Introduction Stage (');
      expect(lastMessage).toContain('Sub-Stage: Getting Started');
    });

    it('should not include stage context section when currentStageInfo is not provided', async () => {
      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Test response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'general',
          userMessage: 'What should I do next?',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            // No currentStageInfo
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;

      expect(lastMessage).not.toContain('=== CURRENT STAGE AND SUB-STAGE ===');
    });

    it('should include stage context before lesson data in the message', async () => {
      const currentStageInfo = {
        stageId: 'stage-1',
        subStageId: 'substage-1',
        stage: {
          id: 'stage-1',
          title: 'Introduction Stage',
          type: 'tease',
        },
        subStage: {
          id: 'substage-1',
          title: 'Getting Started',
          type: 'content',
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);
      grokService.chatCompletion.mockResolvedValue({
        content: 'Test response',
        tokensUsed: 100,
      });

      await service.chat(
        {
          assistantId: 'teacher',
          promptKey: 'general',
          userMessage: 'What should I do next?',
          context: {
            lessonId: 'lesson-123',
            lessonData: mockLessonData,
            currentStageInfo: currentStageInfo,
          },
          conversationHistory: [],
        },
        mockUser,
      );

      const grokCall = grokService.chatCompletion.mock.calls[0][0];
      const lastMessage = grokCall.messages[grokCall.messages.length - 1].content;

      // Stage context should appear before lesson data
      const stageContextIndex = lastMessage.indexOf('=== CURRENT STAGE AND SUB-STAGE ===');
      const lessonDataIndex = lastMessage.indexOf('=== LESSON DATA ===');

      expect(stageContextIndex).toBeGreaterThan(-1);
      expect(lessonDataIndex).toBeGreaterThan(-1);
      expect(stageContextIndex).toBeLessThan(lessonDataIndex);
    });
  });
});

