import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAssistantService, AssistantChatRequest, ChatMessage } from './ai-assistant.service';
import { GrokService } from './grok.service';
import { AiPromptsService } from '../modules/ai-prompts/ai-prompts.service';
import { WeaviateService } from './weaviate.service';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { User } from '../entities/user.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

// Increase timeout for tests that involve async operations and long conversation histories
jest.setTimeout(30000); // 30 seconds

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let grokService: jest.Mocked<GrokService>;
  let aiPromptsService: jest.Mocked<AiPromptsService>;
  let weaviateService: jest.Mocked<WeaviateService>;
  let llmLogRepository: jest.Mocked<Repository<LlmGenerationLog>>;
  let processedOutputRepository: jest.Mocked<Repository<ProcessedContentOutput>>;

  const mockUser: User = {
    id: 'test-user-id',
    tenantId: 'test-tenant-id',
  } as User;

  const mockPrompt: AiPrompt = {
    id: 'inventor.html-interaction',
    assistantId: 'inventor',
    promptKey: 'html-interaction',
    label: 'HTML Interaction Assistant',
    content: 'You are an expert HTML/CSS/JavaScript developer...',
    defaultContent: 'You are an expert HTML/CSS/JavaScript developer...',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSummaryPrompt: AiPrompt = {
    id: 'inventor.conversation-summary',
    assistantId: 'inventor',
    promptKey: 'conversation-summary',
    label: 'Conversation History Summary',
    content: 'Please provide a concise summary of the following conversation history. Focus on:\n1. The main topics discussed\n2. Key decisions or changes made\n\nConversation history:\n{conversation_history}',
    defaultContent: 'Please provide a concise summary...',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  const mockScreenshotCriteriaPrompt: AiPrompt = {
    id: 'teacher.screenshot-criteria',
    assistantId: 'teacher',
    promptKey: 'screenshot-criteria',
    label: 'Screenshot Request Criteria',
    content: 'You should request a screenshot when visual context is needed.',
    defaultContent: 'You should request a screenshot...',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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

    const mockLlmLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockProcessedOutputRepository = {
      find: jest.fn(),
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
          provide: getRepositoryToken(LlmGenerationLog),
          useValue: mockLlmLogRepository,
        },
        {
          provide: getRepositoryToken(ProcessedContentOutput),
          useValue: mockProcessedOutputRepository,
        },
      ],
    }).compile();

    service = module.get<AiAssistantService>(AiAssistantService);
    grokService = module.get(GrokService);
    aiPromptsService = module.get(AiPromptsService);
    weaviateService = module.get(WeaviateService);
    llmLogRepository = module.get(getRepositoryToken(LlmGenerationLog));
    processedOutputRepository = module.get(getRepositoryToken(ProcessedContentOutput));

    // Setup default mocks
    aiPromptsService.findByKey.mockResolvedValue(mockPrompt);
    grokService.chatCompletion.mockResolvedValue({
      content: 'Test response',
      tokensUsed: 100,
      model: 'grok-beta',
      finishReason: 'stop',
    });
    llmLogRepository.create.mockReturnValue({} as LlmGenerationLog);
    llmLogRepository.save.mockResolvedValue({} as LlmGenerationLog);
    weaviateService.searchByContentSourceIds.mockResolvedValue([]);
    processedOutputRepository.find.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should include conversation history in messages when provided', async () => {
      const conversationHistory: ChatMessage[] = [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second message' },
      ];

      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
        conversationHistory,
      };

      await service.chat(request, mockUser);

      expect(grokService.chatCompletion).toHaveBeenCalled();
      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      
      // Should have system prompt + history + current message
      expect(callArgs.messages.length).toBeGreaterThan(2);
      expect(callArgs.messages[0].role).toBe('system');
      
      // Check that history messages are included
      const historyMessages = callArgs.messages.slice(1, -1);
      expect(historyMessages.length).toBe(conversationHistory.length);
      expect(historyMessages[0].content).toBe('First message');
      expect(historyMessages[1].content).toBe('First response');
      expect(historyMessages[2].content).toBe('Second message');
      
      // Last message should be the current user message with context
      const lastMessage = callArgs.messages[callArgs.messages.length - 1];
      expect(lastMessage.role).toBe('user');
      expect(lastMessage.content).toContain('Current message');
    });

    it('should not include history when not provided', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
      };

      await service.chat(request, mockUser);

      expect(grokService.chatCompletion).toHaveBeenCalled();
      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      
      // Should only have system prompt + current message
      expect(callArgs.messages.length).toBe(2);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');
    });

    it('should summarize conversation history when it exceeds threshold', async () => {
      // Create a long conversation history that exceeds 6000 characters
      const longHistory: ChatMessage[] = [];
      for (let i = 0; i < 50; i++) {
        longHistory.push({
          role: 'user',
          content: 'This is a very long message that contains a lot of text. '.repeat(20) + `Message ${i}`,
        });
        longHistory.push({
          role: 'assistant',
          content: 'This is a very long response that contains a lot of text. '.repeat(20) + `Response ${i}`,
        });
      }

      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
        conversationHistory: longHistory,
      };

      // Mock the summary prompt
      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'conversation-summary') {
          return Promise.resolve(mockSummaryPrompt);
        }
        return Promise.resolve(mockPrompt);
      });

      // Mock summary response
      grokService.chatCompletion.mockImplementation((req) => {
        // First call is for summarization
        if (req.messages.some(m => m.content.includes('conversation history'))) {
          return Promise.resolve({
            content: 'Summary of previous conversation: discussed HTML, CSS, and JavaScript interactions.',
            tokensUsed: 50,
            model: 'grok-beta',
            finishReason: 'stop',
          });
        }
        // Second call is for the actual chat
        return Promise.resolve({
          content: 'Test response',
          tokensUsed: 100,
          model: 'grok-beta',
          finishReason: 'stop',
        });
      });

      await service.chat(request, mockUser);

      // Should have been called twice: once for summary, once for chat
      expect(grokService.chatCompletion).toHaveBeenCalledTimes(2);
      
      // First call should be for summarization
      const summaryCall = grokService.chatCompletion.mock.calls[0][0];
      expect(summaryCall.messages[1].content).toContain('conversation history');
      
      // Second call should have the summary instead of full history
      const chatCall = grokService.chatCompletion.mock.calls[1][0];
      const historyMessages = chatCall.messages.slice(1, -1);
      expect(historyMessages.length).toBe(1); // Should only have the summary
      expect(historyMessages[0].content).toContain('Summary of previous conversation');
    });

    it('should load conversation summary prompt from database', async () => {
      const longHistory: ChatMessage[] = [];
      for (let i = 0; i < 50; i++) {
        longHistory.push({
          role: 'user',
          content: 'Long message '.repeat(100) + `Message ${i}`,
        });
      }

      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
        conversationHistory: longHistory,
      };

      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'conversation-summary') {
          return Promise.resolve(mockSummaryPrompt);
        }
        return Promise.resolve(mockPrompt);
      });

      grokService.chatCompletion.mockImplementation((req) => {
        if (req.messages.some(m => m.content.includes('conversation history'))) {
          return Promise.resolve({
            content: 'Test summary',
            tokensUsed: 50,
            model: 'grok-beta',
            finishReason: 'stop',
          });
        }
        return Promise.resolve({
          content: 'Test response',
          tokensUsed: 100,
          model: 'grok-beta',
          finishReason: 'stop',
        });
      });

      await service.chat(request, mockUser);

      // Should have called findByKey for the summary prompt
      expect(aiPromptsService.findByKey).toHaveBeenCalledWith('inventor', 'conversation-summary');
      
      // Should have used the prompt content
      const summaryCall = grokService.chatCompletion.mock.calls[0][0];
      expect(summaryCall.messages[1].content).toContain('Please provide a concise summary');
      expect(summaryCall.messages[1].content).toContain('conversation history');
    });

    it('should handle missing summary prompt gracefully', async () => {
      const longHistory: ChatMessage[] = [];
      for (let i = 0; i < 50; i++) {
        longHistory.push({
          role: 'user',
          content: 'Long message '.repeat(100) + `Message ${i}`,
        });
      }

      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
        conversationHistory: longHistory,
      };

      // Summary prompt not found
      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'conversation-summary') {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockPrompt);
      });

      await service.chat(request, mockUser);

      // Should still proceed with chat, but without summarization
      // The history should be truncated or handled differently
      expect(grokService.chatCompletion).toHaveBeenCalled();
    });

    it('should replace conversation_history placeholder in summary prompt', async () => {
      // Create history with both user and assistant messages
      const longHistory: ChatMessage[] = [];
      for (let i = 0; i < 50; i++) {
        longHistory.push({
          role: 'user',
          content: 'Long message '.repeat(100) + `Message ${i}`,
        });
        longHistory.push({
          role: 'assistant',
          content: 'Long response '.repeat(100) + `Response ${i}`,
        });
      }

      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
        conversationHistory: longHistory,
      };

      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'conversation-summary') {
          return Promise.resolve(mockSummaryPrompt);
        }
        return Promise.resolve(mockPrompt);
      });

      grokService.chatCompletion.mockImplementation((req) => {
        if (req.messages.some(m => m.content.includes('conversation history'))) {
          return Promise.resolve({
            content: 'Test summary',
            tokensUsed: 50,
            model: 'grok-beta',
            finishReason: 'stop',
          });
        }
        return Promise.resolve({
          content: 'Test response',
          tokensUsed: 100,
          model: 'grok-beta',
          finishReason: 'stop',
        });
      });

      await service.chat(request, mockUser);

      // Check that placeholder was replaced
      const summaryCall = grokService.chatCompletion.mock.calls[0][0];
      const userMessage = summaryCall.messages[1].content;
      
      // Should not contain the placeholder
      expect(userMessage).not.toContain('{conversation_history}');
      // Should contain actual conversation history
      expect(userMessage).toContain('User:');
      expect(userMessage).toContain('Assistant:');
      // Should contain some of the actual message content
      expect(userMessage).toContain('Message 0');
    });

    it('should log summarization usage separately', async () => {
      const longHistory: ChatMessage[] = [];
      for (let i = 0; i < 50; i++) {
        longHistory.push({
          role: 'user',
          content: 'Long message '.repeat(100) + `Message ${i}`,
        });
      }

      const request: AssistantChatRequest = {
        assistantId: 'inventor',
        promptKey: 'html-interaction',
        userMessage: 'Current message',
        context: {},
        conversationHistory: longHistory,
      };

      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'conversation-summary') {
          return Promise.resolve(mockSummaryPrompt);
        }
        return Promise.resolve(mockPrompt);
      });

      grokService.chatCompletion.mockImplementation((req) => {
        if (req.messages.some(m => m.content.includes('conversation history'))) {
          return Promise.resolve({
            content: 'Test summary',
            tokensUsed: 50,
            model: 'grok-beta',
            finishReason: 'stop',
          });
        }
        return Promise.resolve({
          content: 'Test response',
          tokensUsed: 100,
          model: 'grok-beta',
          finishReason: 'stop',
        });
      });

      await service.chat(request, mockUser);

      // Should have logged summarization usage
      expect(llmLogRepository.create).toHaveBeenCalledTimes(2); // Summary + chat
      
      const summaryLog = llmLogRepository.create.mock.calls[0][0];
      expect(summaryLog.assistantId).toBe('inventor');
      expect(summaryLog.useCase).toBe('ai-assistant-inventor');
      // The promptKey in the log should indicate it's a summary
      expect(summaryLog.promptText).toContain('conversation-summary');
    });
  });

  describe('Teacher Assistant Features', () => {
    it('should include screenshot criteria prompt in teacher assistant queries', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What should I do next?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'screenshot-criteria') {
          return Promise.resolve(mockScreenshotCriteriaPrompt);
        }
        if (assistantId === 'teacher' && promptKey === 'general') {
          return Promise.resolve(mockTeacherPrompt);
        }
        return Promise.resolve(mockPrompt);
      });

      await service.chat(request, mockUser);

      expect(aiPromptsService.findByKey).toHaveBeenCalledWith('teacher', 'screenshot-criteria');
      
      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      
      expect(systemPrompt).toContain('SCREENSHOT REQUEST CRITERIA');
      expect(systemPrompt).toContain('You should request a screenshot when visual context is needed');
    });

    it('should perform Weaviate search for teacher assistant with lesson context', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What is photosynthesis?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      const mockContentSources = [
        { id: 'source-1', contentSourceId: 'source-1' },
        { id: 'source-2', contentSourceId: 'source-2' },
      ];

      const mockWeaviateResults = [
        {
          title: 'Photosynthesis Basics',
          summary: 'Photosynthesis is the process by which plants convert light energy into chemical energy.',
          fullText: 'Full text about photosynthesis...',
          topics: ['biology', 'plants'],
          keywords: ['photosynthesis', 'chlorophyll'],
          sourceUrl: 'https://example.com/photosynthesis',
          contentCategory: 'source_content' as const,
          relevanceScore: 0.95,
        },
      ];

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue(mockContentSources as any);
      weaviateService.searchByContentSourceIds.mockResolvedValue(mockWeaviateResults as any);

      await service.chat(request, mockUser);

      expect(processedOutputRepository.find).toHaveBeenCalledWith({
        where: { lessonId: 'test-lesson-id' },
        select: ['contentSourceId'],
      });

      expect(weaviateService.searchByContentSourceIds).toHaveBeenCalledWith(
        'What is photosynthesis?',
        ['source-1', 'source-2'],
        'test-tenant-id',
        5,
      );

      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      const userMessage = callArgs.messages[callArgs.messages.length - 1].content;
      
      expect(userMessage).toContain('RELEVANT CONTENT CHUNKS');
      expect(userMessage).toContain('Photosynthesis Basics');
      expect(userMessage).toContain('Photosynthesis is the process');
    });

    it('should include lesson data in teacher assistant queries', async () => {
      const lessonData = {
        structure: {
          stages: [
            {
              id: 1,
              title: 'Introduction',
              subStages: [{ id: 1, title: 'Welcome' }],
            },
          ],
        },
      };

      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What stage am I on?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData,
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);

      await service.chat(request, mockUser);

      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      const userMessage = callArgs.messages[callArgs.messages.length - 1].content;
      
      expect(userMessage).toContain('LESSON DATA');
      expect(userMessage).toContain('Introduction');
      expect(userMessage).toContain('Welcome');
    });

    it('should handle empty Weaviate results gracefully', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What is this about?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockResolvedValue([]);
      weaviateService.searchByContentSourceIds.mockResolvedValue([]);

      await service.chat(request, mockUser);

      // Should still complete successfully without Weaviate results
      expect(grokService.chatCompletion).toHaveBeenCalled();
      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      const userMessage = callArgs.messages[callArgs.messages.length - 1].content;
      
      // Should not have RELEVANT CONTENT CHUNKS section if empty
      expect(userMessage).not.toContain('RELEVANT CONTENT CHUNKS');
    });

    it('should log token usage for teacher assistant with correct assistant_id', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'Help me understand this lesson',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      grokService.chatCompletion.mockResolvedValue({
        content: 'I can help you understand this lesson.',
        tokensUsed: 150,
        model: 'grok-beta',
        finishReason: 'stop',
      });

      await service.chat(request, mockUser);

      expect(llmLogRepository.create).toHaveBeenCalled();
      const logCall = llmLogRepository.create.mock.calls[0][0];
      
      expect(logCall.assistantId).toBe('teacher');
      expect(logCall.useCase).toBe('ai-assistant-teacher');
      expect(logCall.tokensUsed).toBe(150);
      expect(logCall.userId).toBe('test-user-id');
      expect(logCall.tenantId).toBe('test-tenant-id');
      
      expect(llmLogRepository.save).toHaveBeenCalled();
    });

    it('should handle screenshot request in response content', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What does this button do?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      grokService.chatCompletion.mockResolvedValue({
        content: 'I need to see what you\'re looking at. [SCREENSHOT_REQUEST]',
        tokensUsed: 120,
        model: 'grok-beta',
        finishReason: 'stop',
      });

      const response = await service.chat(request, mockUser);

      // Response should contain the screenshot request marker
      expect(response.content).toContain('[SCREENSHOT_REQUEST]');
      expect(response.tokensUsed).toBe(120);
    });

    it('should handle missing screenshot criteria prompt gracefully', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What should I do?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      aiPromptsService.findByKey.mockImplementation((assistantId, promptKey) => {
        if (promptKey === 'screenshot-criteria') {
          return Promise.resolve(null);
        }
        if (assistantId === 'teacher' && promptKey === 'general') {
          return Promise.resolve(mockTeacherPrompt);
        }
        return Promise.resolve(mockPrompt);
      });

      await service.chat(request, mockUser);

      // Should still complete successfully
      expect(grokService.chatCompletion).toHaveBeenCalled();
      const callArgs = grokService.chatCompletion.mock.calls[0][0];
      const systemPrompt = callArgs.messages[0].content;
      
      // Should not have screenshot criteria section if prompt not found
      expect(systemPrompt).not.toContain('SCREENSHOT REQUEST CRITERIA');
    });

    it('should handle Weaviate search errors gracefully', async () => {
      const request: AssistantChatRequest = {
        assistantId: 'teacher',
        promptKey: 'general',
        userMessage: 'What is this about?',
        context: {
          lessonId: 'test-lesson-id',
          lessonData: { structure: { stages: [] } },
        },
      };

      aiPromptsService.findByKey.mockResolvedValue(mockTeacherPrompt);
      processedOutputRepository.find.mockRejectedValue(new Error('Database error'));

      // Should not throw, should continue without Weaviate results
      await expect(service.chat(request, mockUser)).resolves.toBeDefined();
      
      expect(grokService.chatCompletion).toHaveBeenCalled();
    });
  });
});

