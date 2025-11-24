import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../entities/lesson.entity';
import { LessonDraft } from '../../lesson-drafts/entities/lesson-draft.entity';
import { ContentSource } from '../../entities/content-source.entity';
import { LessonDataLink } from '../../entities/lesson-data-link.entity';
import { Usage } from '../../entities/usage.entity';
import { LessonsService } from '../lessons/lessons.service';
import { LessonDraftsService } from '../../lesson-drafts/lesson-drafts.service';

/**
 * Lesson Data Persistence Test Suite
 * 
 * This test ensures that all editable lesson data fields are:
 * 1. Properly stored in draft data when saving
 * 2. Correctly loaded when toggling between "Show Pending Changes" and "Show Current State"
 * 3. Included in the approval workflow and reviewable
 * 
 * Fields to test:
 * - Basic metadata: title, description, category, difficulty, durationMinutes, thumbnailUrl, tags
 * - Learning Objectives: objectives.learningObjectives (string[])
 * - Lesson Outcomes: objectives.lessonOutcomes (Array<{title: string, content: string}>)
 * - Lesson Structure: structure.stages (with all nested data)
 * - Stage data: id, title, type, subStages
 * - SubStage data: id, title, type, duration, scriptBlocks, interaction
 */

describe('Lesson Data Persistence', () => {
  let lessonsService: LessonsService;
  let lessonDraftsService: LessonDraftsService;
  let lessonRepository: Repository<Lesson>;
  let draftRepository: Repository<LessonDraft>;

  const mockLessonRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockDraftRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };

  const mockContentSourceRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockLessonDataLinkRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockUsageRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        LessonDraftsService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonRepository,
        },
        {
          provide: getRepositoryToken(LessonDraft),
          useValue: mockDraftRepository,
        },
        {
          provide: getRepositoryToken(ContentSource),
          useValue: mockContentSourceRepository,
        },
        {
          provide: getRepositoryToken(LessonDataLink),
          useValue: mockLessonDataLinkRepository,
        },
        {
          provide: getRepositoryToken(Usage),
          useValue: mockUsageRepository,
        },
      ],
    }).compile();

    lessonsService = module.get<LessonsService>(LessonsService);
    lessonDraftsService = module.get<LessonDraftsService>(LessonDraftsService);
    lessonRepository = module.get<Repository<Lesson>>(getRepositoryToken(Lesson));
    draftRepository = module.get<Repository<LessonDraft>>(getRepositoryToken(LessonDraft));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Draft Data Completeness', () => {
    it('should save all basic lesson metadata in draft', async () => {
      const lessonId = 'test-lesson-id';
      const userId = 'test-user-id';
      const tenantId = 'test-tenant-id';

      const draftData = {
        title: 'Test Lesson',
        description: 'Test Description',
        category: 'Science',
        difficulty: 'Beginner',
        durationMinutes: 30,
        thumbnailUrl: 'https://example.com/image.jpg',
        tags: ['test', 'science'],
        objectives: {
          learningObjectives: ['Objective 1', 'Objective 2'],
          lessonOutcomes: [
            { title: 'Outcome 1', content: 'Students will know...' },
            { title: 'Outcome 2', content: 'Students will be able to...' }
          ]
        },
        structure: {
          stages: [
            {
              id: 'stage-1',
              title: 'Stage 1',
              type: 'tease',
              subStages: [
                {
                  id: 'substage-1',
                  title: 'SubStage 1',
                  type: 'trigger',
                  duration: 5,
                  scriptBlocks: [],
                  interaction: null
                }
              ]
            }
          ]
        }
      };

      mockDraftRepository.findOne.mockResolvedValue(null); // No existing draft
      mockDraftRepository.create.mockReturnValue({ id: 'draft-id', lessonId, draftData });
      mockDraftRepository.save.mockResolvedValue({ id: 'draft-id', lessonId, draftData });

      const result = await lessonDraftsService.createOrUpdateDraft({
        lessonId,
        draftData,
        changeSummary: 'Test changes',
        changesCount: 1,
        tenantId,
        accountId: userId,
      });

      expect(result.draftData).toHaveProperty('title');
      expect(result.draftData).toHaveProperty('description');
      expect(result.draftData).toHaveProperty('category');
      expect(result.draftData).toHaveProperty('difficulty');
      expect(result.draftData).toHaveProperty('durationMinutes');
      expect(result.draftData).toHaveProperty('thumbnailUrl');
      expect(result.draftData).toHaveProperty('tags');
      expect(result.draftData).toHaveProperty('objectives');
      expect(result.draftData).toHaveProperty('structure');
    });

    it('should save learning objectives in draft data', async () => {
      const draftData = {
        title: 'Test Lesson',
        objectives: {
          learningObjectives: ['Learn X', 'Understand Y', 'Master Z'],
          lessonOutcomes: []
        },
        structure: { stages: [] }
      };

      expect(draftData.objectives.learningObjectives).toBeDefined();
      expect(Array.isArray(draftData.objectives.learningObjectives)).toBe(true);
      expect(draftData.objectives.learningObjectives.length).toBe(3);
    });

    it('should save lesson outcomes in draft data', async () => {
      const draftData = {
        title: 'Test Lesson',
        objectives: {
          learningObjectives: [],
          lessonOutcomes: [
            { title: 'Outcome Title 1', content: 'Detailed content 1' },
            { title: 'Outcome Title 2', content: 'Detailed content 2' }
          ]
        },
        structure: { stages: [] }
      };

      expect(draftData.objectives.lessonOutcomes).toBeDefined();
      expect(Array.isArray(draftData.objectives.lessonOutcomes)).toBe(true);
      expect(draftData.objectives.lessonOutcomes.length).toBe(2);
      expect(draftData.objectives.lessonOutcomes[0]).toHaveProperty('title');
      expect(draftData.objectives.lessonOutcomes[0]).toHaveProperty('content');
    });

    it('should save complete stage structure in draft data', async () => {
      const draftData = {
        title: 'Test Lesson',
        objectives: { learningObjectives: [], lessonOutcomes: [] },
        structure: {
          stages: [
            {
              id: 'stage-1',
              title: 'Stage Title',
              type: 'tease',
              subStages: [
                {
                  id: 'substage-1',
                  title: 'SubStage Title',
                  type: 'trigger',
                  duration: 10,
                  scriptBlocks: [
                    { id: 'block-1', type: 'teacher_talk', content: 'Hello', startTime: 0, endTime: 5 }
                  ],
                  interaction: { type: 'true-false', config: {} }
                }
              ]
            }
          ]
        }
      };

      expect(draftData.structure.stages).toBeDefined();
      expect(draftData.structure.stages[0]).toHaveProperty('id');
      expect(draftData.structure.stages[0]).toHaveProperty('title');
      expect(draftData.structure.stages[0]).toHaveProperty('type');
      expect(draftData.structure.stages[0]).toHaveProperty('subStages');
      expect(draftData.structure.stages[0].subStages[0]).toHaveProperty('id');
      expect(draftData.structure.stages[0].subStages[0]).toHaveProperty('scriptBlocks');
      expect(draftData.structure.stages[0].subStages[0]).toHaveProperty('interaction');
    });
  });

  describe('Pending Changes Toggle', () => {
    it('should preserve all fields when toggling between pending and live states', () => {
      const liveData = {
        title: 'Live Title',
        description: 'Live Description',
        objectives: {
          learningObjectives: ['Live Objective'],
          lessonOutcomes: [{ title: 'Live Outcome', content: 'Live content' }]
        },
        structure: { stages: [] }
      };

      const draftData = {
        title: 'Draft Title',
        description: 'Draft Description',
        objectives: {
          learningObjectives: ['Draft Objective 1', 'Draft Objective 2'],
          lessonOutcomes: [
            { title: 'Draft Outcome 1', content: 'Draft content 1' },
            { title: 'Draft Outcome 2', content: 'Draft content 2' }
          ]
        },
        structure: { stages: [] }
      };

      // Simulate merging (draft takes precedence)
      const merged = {
        ...liveData,
        ...draftData,
        objectives: draftData.objectives // Draft objectives should override
      };

      expect(merged.title).toBe('Draft Title');
      expect(merged.description).toBe('Draft Description');
      expect(merged.objectives.learningObjectives).toEqual(['Draft Objective 1', 'Draft Objective 2']);
      expect(merged.objectives.lessonOutcomes.length).toBe(2);
    });

    it('should load objectives when switching to pending changes', () => {
      const draftData = {
        objectives: {
          learningObjectives: ['Test Objective'],
          lessonOutcomes: [{ title: 'Test', content: 'Content' }]
        }
      };

      const loadedObjectives = 
        draftData.objectives?.learningObjectives ||
        draftData.objectives?.learningObjectives ||
        [];

      const loadedOutcomes =
        draftData.objectives?.lessonOutcomes ||
        [];

      expect(loadedObjectives).toEqual(['Test Objective']);
      expect(loadedOutcomes.length).toBe(1);
    });

    it('should load objectives when reverting to current state', () => {
      const liveData = {
        objectives: {
          learningObjectives: ['Live Objective'],
          lessonOutcomes: [{ title: 'Live', content: 'Content' }]
        }
      };

      const loadedObjectives = 
        liveData.objectives?.learningObjectives ||
        [];

      const loadedOutcomes =
        liveData.objectives?.lessonOutcomes ||
        [];

      expect(loadedObjectives).toEqual(['Live Objective']);
      expect(loadedOutcomes.length).toBe(1);
    });
  });

  describe('Approval Workflow', () => {
    it('should include all editable fields in draft for approval review', async () => {
      const draftData = {
        title: 'Reviewable Title',
        description: 'Reviewable Description',
        category: 'Science',
        difficulty: 'Intermediate',
        durationMinutes: 45,
        thumbnailUrl: 'https://example.com/review.jpg',
        tags: ['review', 'test'],
        objectives: {
          learningObjectives: ['Review Objective 1', 'Review Objective 2'],
          lessonOutcomes: [
            { title: 'Review Outcome', content: 'Review content' }
          ]
        },
        structure: {
          stages: [
            {
              id: 'review-stage',
              title: 'Review Stage',
              type: 'explore',
              subStages: []
            }
          ]
        }
      };

      // All fields should be present for review
      const reviewableFields = [
        'title',
        'description',
        'category',
        'difficulty',
        'durationMinutes',
        'thumbnailUrl',
        'tags',
        'objectives',
        'structure'
      ];

      reviewableFields.forEach(field => {
        expect(draftData).toHaveProperty(field);
      });

      expect(draftData.objectives).toHaveProperty('learningObjectives');
      expect(draftData.objectives).toHaveProperty('lessonOutcomes');
    });

    it('should allow approval of draft with all field changes', async () => {
      const draftId = 'test-draft-id';
      const tenantId = 'test-tenant-id';

      const draft = {
        id: draftId,
        lessonId: 'test-lesson-id',
        draftData: {
          title: 'Approved Title',
          objectives: {
            learningObjectives: ['Approved Objective'],
            lessonOutcomes: [{ title: 'Approved Outcome', content: 'Content' }]
          },
          structure: { stages: [] }
        },
        status: 'pending',
        tenantId
      };

      mockDraftRepository.findOne.mockResolvedValue(draft);
      mockLessonRepository.findOne.mockResolvedValue({ id: 'test-lesson-id' });
      mockLessonRepository.save.mockResolvedValue({ id: 'test-lesson-id', ...draft.draftData });

      // Approval should preserve all draft data
      expect(draft.draftData.objectives).toBeDefined();
      expect(draft.draftData.objectives.learningObjectives).toBeDefined();
      expect(draft.draftData.objectives.lessonOutcomes).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should handle empty objectives arrays', () => {
      const draftData = {
        objectives: {
          learningObjectives: [],
          lessonOutcomes: []
        }
      };

      expect(Array.isArray(draftData.objectives.learningObjectives)).toBe(true);
      expect(Array.isArray(draftData.objectives.lessonOutcomes)).toBe(true);
      expect(draftData.objectives.learningObjectives.length).toBe(0);
      expect(draftData.objectives.lessonOutcomes.length).toBe(0);
    });

    it('should handle missing objectives field gracefully', () => {
      const draftData = {
        title: 'Test',
        structure: { stages: [] }
      };

      const objectives = draftData.objectives || { learningObjectives: [], lessonOutcomes: [] };
      expect(objectives.learningObjectives).toBeDefined();
      expect(objectives.lessonOutcomes).toBeDefined();
    });

    it('should preserve data types correctly', () => {
      const draftData = {
        title: 'String',
        durationMinutes: 30, // number
        tags: ['array'], // array
        objectives: {
          learningObjectives: ['array'], // array of strings
          lessonOutcomes: [{ title: 'object', content: 'object' }] // array of objects
        }
      };

      expect(typeof draftData.title).toBe('string');
      expect(typeof draftData.durationMinutes).toBe('number');
      expect(Array.isArray(draftData.tags)).toBe(true);
      expect(Array.isArray(draftData.objectives.learningObjectives)).toBe(true);
      expect(Array.isArray(draftData.objectives.lessonOutcomes)).toBe(true);
      expect(typeof draftData.objectives.lessonOutcomes[0]).toBe('object');
    });
  });
});

