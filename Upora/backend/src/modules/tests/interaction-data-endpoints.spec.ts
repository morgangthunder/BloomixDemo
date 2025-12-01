import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InteractionDataService } from '../../services/interaction-data.service';
import { InteractionInstanceData } from '../../entities/interaction-instance-data.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { UserPublicProfile } from '../../entities/user-public-profile.entity';
import { InteractionType } from '../../entities/interaction-type.entity';

describe('Interaction Data Endpoints (SDK Tests)', () => {
  let service: InteractionDataService;
  let instanceDataRepository: any;
  let userProgressRepository: any;
  let publicProfileRepository: any;

  const mockInstanceDataRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserProgressRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPublicProfileRepository = {
    findOne: jest.fn(),
  };

  const mockInteractionTypeRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionDataService,
        {
          provide: getRepositoryToken(InteractionInstanceData),
          useValue: mockInstanceDataRepository,
        },
        {
          provide: getRepositoryToken(UserInteractionProgress),
          useValue: mockUserProgressRepository,
        },
        {
          provide: getRepositoryToken(UserPublicProfile),
          useValue: mockPublicProfileRepository,
        },
        {
          provide: getRepositoryToken(InteractionType),
          useValue: mockInteractionTypeRepository,
        },
      ],
    }).compile();

    service = module.get<InteractionDataService>(InteractionDataService);
    instanceDataRepository = module.get(getRepositoryToken(InteractionInstanceData));
    userProgressRepository = module.get(getRepositoryToken(UserInteractionProgress));
    publicProfileRepository = module.get(getRepositoryToken(UserPublicProfile));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core SDK Methods - Instance Data', () => {
    it('should save instance data successfully', async () => {
      const dto = {
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        processedContentId: 'processed-1',
        instanceData: { testValue: 123, timestamp: Date.now() },
      };

      const mockSaved = {
        id: 'instance-1',
        ...dto,
        createdAt: new Date(),
      };

      // Mock interaction type lookup (no schema validation)
      mockInteractionTypeRepository.findOne.mockResolvedValue(null);
      mockInstanceDataRepository.create.mockReturnValue(mockSaved);
      mockInstanceDataRepository.save.mockResolvedValue(mockSaved);

      await service.saveInstanceData(dto);

      expect(mockInstanceDataRepository.create).toHaveBeenCalled();
      expect(mockInstanceDataRepository.save).toHaveBeenCalled();
    });

    it('should get instance data history with filters', async () => {
      const dto = {
        interactionTypeId: 'test-interaction-1',
        lessonId: 'test-lesson-1',
        substageId: 'substage-1',
        userId: 'user-1',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-12-31'),
        limit: 10,
      };

      const mockHistory = [
        {
          id: 'instance-1',
          instanceData: { testValue: 123 },
          createdAt: new Date(),
        },
        {
          id: 'instance-2',
          instanceData: { testValue: 456 },
          createdAt: new Date(),
        },
      ];

      // Mock interaction type lookup
      mockInteractionTypeRepository.findOne.mockResolvedValue({
        id: 'test-interaction-1',
        name: 'Test Interaction',
      });
      
      // Mock query builder
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockHistory),
      };
      
      mockInstanceDataRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      const result = await service.getInstanceDataHistory(dto, 'user-1', 'interaction-builder');

      expect(result).toHaveLength(2);
      expect(mockInstanceDataRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should allow students to access their own instance data history', async () => {
      const dto = {
        interactionTypeId: 'test-interaction-1',
        lessonId: 'test-lesson-1',
        substageId: 'substage-1',
        userId: 'user-1',
      };

      const mockHistory = [
        {
          id: 'instance-1',
          instanceData: { testValue: 123 },
          createdAt: new Date(),
        },
      ];

      // Mock interaction type lookup
      mockInteractionTypeRepository.findOne.mockResolvedValue({
        id: 'test-interaction-1',
        name: 'Test Interaction',
      });
      
      // Mock query builder
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockHistory),
      };
      
      mockInstanceDataRepository.createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      // Student accessing their own data should work
      const result = await service.getInstanceDataHistory(dto, 'user-1', 'student');

      expect(result).toHaveLength(1);
      expect(mockInstanceDataRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('Core SDK Methods - User Progress', () => {
    it('should save user progress successfully', async () => {
      const dto = {
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        score: 85,
        completed: false,
        customData: { testField: 'test value' },
      };

      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        ...dto,
        attempts: 1,
        startTimestamp: new Date(),
      };

      // Mock interaction type lookup (no schema validation)
      mockInteractionTypeRepository.findOne.mockResolvedValue(null);
      mockUserProgressRepository.findOne.mockResolvedValue(null); // No existing progress
      mockUserProgressRepository.create.mockReturnValue(mockProgress);
      mockUserProgressRepository.save.mockResolvedValue(mockProgress);

      const result = await service.saveUserProgress('user-1', 'tenant-1', dto);

      expect(result).toBeDefined();
      expect(result.score).toBe(85);
      expect(mockUserProgressRepository.save).toHaveBeenCalled();
    });

    it('should get user progress', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        attempts: 3,
        completed: false,
        score: 90,
      };

      mockUserProgressRepository.findOne.mockResolvedValue(mockProgress);

      const result = await service.getUserProgress(
        'user-1',
        'test-lesson-1',
        'stage-1',
        'substage-1',
        'test-interaction-1'
      );

      expect(result).toBeDefined();
      expect(result?.attempts).toBe(3);
      expect(result?.score).toBe(90);
    });

    it('should mark interaction as completed', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        attempts: 2,
        completed: false,
      };

      mockUserProgressRepository.findOne.mockResolvedValue(mockProgress);
      mockUserProgressRepository.save.mockResolvedValue({
        ...mockProgress,
        completed: true,
        completeTimestamp: new Date(),
      });

      const result = await service.markCompleted(
        'user-1',
        'test-lesson-1',
        'stage-1',
        'substage-1',
        'test-interaction-1'
      );

      expect(result.completed).toBe(true);
      expect(mockUserProgressRepository.save).toHaveBeenCalled();
    });

    it('should create progress if not found when marking completed', async () => {
      mockUserProgressRepository.findOne.mockResolvedValue(null); // No existing progress

      const mockNewProgress = {
        id: 'progress-new',
        userId: 'user-1',
        tenantId: 'tenant-1',
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        attempts: 0,
        completed: true,
        completeTimestamp: new Date(),
      };

      mockUserProgressRepository.create.mockReturnValue(mockNewProgress);
      mockUserProgressRepository.save.mockResolvedValue(mockNewProgress);

      const result = await service.markCompleted(
        'user-1',
        'test-lesson-1',
        'stage-1',
        'substage-1',
        'test-interaction-1'
      );

      expect(result).toBeDefined();
      expect(result.completed).toBe(true);
      expect(mockUserProgressRepository.create).toHaveBeenCalled();
    });

    it('should increment attempts', async () => {
      const mockProgress = {
        id: 'progress-1',
        userId: 'user-1',
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        attempts: 2,
        completed: false,
      };

      mockUserProgressRepository.findOne.mockResolvedValue(mockProgress);
      mockUserProgressRepository.save.mockResolvedValue({
        ...mockProgress,
        attempts: 3,
      });

      const result = await service.incrementAttempts(
        'user-1',
        'test-lesson-1',
        'stage-1',
        'substage-1',
        'test-interaction-1'
      );

      expect(result.attempts).toBe(3);
      expect(mockUserProgressRepository.save).toHaveBeenCalled();
    });

    it('should create progress if not found when incrementing attempts', async () => {
      mockUserProgressRepository.findOne.mockResolvedValue(null); // No existing progress

      const mockNewProgress = {
        id: 'progress-new',
        userId: 'user-1',
        tenantId: 'tenant-1',
        lessonId: 'test-lesson-1',
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        attempts: 1,
        completed: false,
      };

      mockUserProgressRepository.create.mockReturnValue(mockNewProgress);
      mockUserProgressRepository.save.mockResolvedValue(mockNewProgress);

      const result = await service.incrementAttempts(
        'user-1',
        'test-lesson-1',
        'stage-1',
        'substage-1',
        'test-interaction-1'
      );

      expect(result).toBeDefined();
      expect(result.attempts).toBe(1);
      expect(mockUserProgressRepository.create).toHaveBeenCalled();
    });
  });

  describe('Core SDK Methods - Public Profile', () => {
    it('should get user public profile', async () => {
      const mockProfile = {
        userId: 'user-1',
        displayName: 'Test User',
        shareName: true,
        sharePreferences: false,
        preferences: { theme: 'dark' },
      };

      mockPublicProfileRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.getUserPublicProfile('user-1');

      expect(result).toBeDefined();
      expect(result?.displayName).toBe('Test User');
      expect(mockPublicProfileRepository.findOne).toHaveBeenCalled();
    });

    it('should return null if profile not found (this is a pass)', async () => {
      mockPublicProfileRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserPublicProfile('user-1');

      // No profile found is a valid response, not an error
      expect(result).toBeNull();
      // This test passes - no profile is a valid state
    });
  });

  describe('SDK Method Validation', () => {
    it('should validate required fields for saveInstanceData', async () => {
      const invalidDto = {
        lessonId: '', // Empty
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
        instanceData: {},
      };

      await expect(
        service.saveInstanceData(invalidDto as any)
      ).rejects.toThrow();
    });

    it('should validate required fields for saveUserProgress', async () => {
      const invalidDto = {
        lessonId: '', // Empty
        stageId: 'stage-1',
        substageId: 'substage-1',
        interactionTypeId: 'test-interaction-1',
      };

      await expect(
        service.saveUserProgress('user-1', 'tenant-1', invalidDto as any)
      ).rejects.toThrow();
    });
  });
});

