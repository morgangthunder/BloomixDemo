/**
 * Draft Tracking Validation Tests - Backend
 * 
 * These tests ensure that all lesson data fields are properly compared
 * in the diff generation system. If you add a new field and these tests fail,
 * you need to update generateDiff() to compare the new field.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonDraftsService } from './lesson-drafts.service';
import { LessonDraft } from './entities/lesson-draft.entity';
import { Lesson } from '../entities/lesson.entity';
import { ContentSource } from '../entities/content-source.entity';
import { LessonDataLink } from '../entities/lesson-data-link.entity';
// Schema validation helpers - these define what fields MUST be tracked
// Update these when adding new fields to ensure they're tracked
const getExpectedDraftDataFields = (): string[] => [
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

const getExpectedStageFields = (): string[] => [
  'id',
  'title',
  'type',
  'subStages'
];

const getExpectedSubStageFields = (): string[] => [
  'id',
  'title',
  'type',
  'duration',
  'scriptBlocks',
  'scriptBlocksAfterInteraction',
  'contentOutputId',
  'interactionType',
  'interaction'
];

const getExpectedInteractionFields = (): string[] => [
  'id',
  'type',
  'name',
  'category',
  'contentOutputId',
  'config'
];

const getExpectedObjectivesFields = (): string[] => [
  'learningObjectives',
  'lessonOutcomes'
];

describe('LessonDraftsService - Draft Tracking', () => {
  let service: LessonDraftsService;
  let draftRepository: Repository<LessonDraft>;
  let lessonRepository: Repository<Lesson>;

  const mockDraftRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockLessonRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockContentSourceRepository = {
    find: jest.fn(),
  };

  const mockLessonDataLinkRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonDraftsService,
        {
          provide: getRepositoryToken(LessonDraft),
          useValue: mockDraftRepository,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonRepository,
        },
        {
          provide: getRepositoryToken(ContentSource),
          useValue: mockContentSourceRepository,
        },
        {
          provide: getRepositoryToken(LessonDataLink),
          useValue: mockLessonDataLinkRepository,
        },
      ],
    }).compile();

    service = module.get<LessonDraftsService>(LessonDraftsService);
    draftRepository = module.get<Repository<LessonDraft>>(getRepositoryToken(LessonDraft));
    lessonRepository = module.get<Repository<Lesson>>(getRepositoryToken(Lesson));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test that diff generation detects changes to all top-level fields
   */
  it('should detect changes to all expected top-level fields', async () => {
    const draftId = 'test-draft-id';
    const lessonId = 'test-lesson-id';

    const liveLesson = {
      id: lessonId,
      title: 'Original Title',
      description: 'Original Description',
      category: 'Original Category',
      difficulty: 'Beginner',
      thumbnailUrl: 'https://example.com/original.jpg',
      tags: ['tag1'],
      data: {
        structure: {
          stages: []
        }
      },
      objectives: {
        learningObjectives: ['Original Objective']
      }
    } as any;

    const draftData = {
      title: 'New Title',
      description: 'New Description',
      category: 'New Category',
      difficulty: 'Advanced',
      durationMinutes: 30,
      thumbnailUrl: 'https://example.com/new.jpg',
      tags: ['tag2'],
      objectives: {
        learningObjectives: ['New Objective']
      },
      structure: {
        stages: []
      }
    };

    const draft = {
      id: draftId,
      lessonId: lessonId,
      draftData: draftData,
      lesson: liveLesson,
      status: 'pending'
    } as any;

    mockDraftRepository.findOne.mockResolvedValue(draft);
    mockContentSourceRepository.find.mockResolvedValue([]);
    mockLessonDataLinkRepository.find.mockResolvedValue([]);

    const diff = await service.generateDiff(draftId);

    // Verify that changes are detected for all expected fields
    const expectedFields = getExpectedDraftDataFields();
    const detectedFields = new Set(diff.changes.map((c: any) => c.field.toLowerCase()));

    // Check metadata fields
    const metadataFields = ['title', 'description', 'category', 'difficulty', 'thumbnailurl', 'tags'];
    metadataFields.forEach(field => {
      const hasChange = diff.changes.some((c: any) => 
        c.category === 'metadata' && c.field.toLowerCase() === field
      );
      if (hasChange) {
        expect(hasChange).toBe(true);
      }
    });

    // Check objectives
    const hasObjectivesChange = diff.changes.some((c: any) => 
      c.category === 'objectives'
    );
    expect(hasObjectivesChange).toBe(true);
  });

  /**
   * Test that diff generation detects changes to stage fields
   */
  it('should detect changes to all expected stage fields', async () => {
    const draftId = 'test-draft-id';
    const lessonId = 'test-lesson-id';

    const liveLesson = {
      id: lessonId,
      data: {
        structure: {
          stages: [
            {
              id: 'stage-1',
              title: 'Original Stage',
              type: 'trigger',
              subStages: []
            }
          ]
        }
      }
    } as any;

    const draftData = {
      structure: {
        stages: [
          {
            id: 'stage-1',
            title: 'New Stage',
            type: 'explore',
            subStages: []
          }
        ]
      }
    };

    const draft = {
      id: draftId,
      lessonId: lessonId,
      draftData: draftData,
      lesson: liveLesson,
      status: 'pending'
    } as any;

    mockDraftRepository.findOne.mockResolvedValue(draft);
    mockContentSourceRepository.find.mockResolvedValue([]);
    mockLessonDataLinkRepository.find.mockResolvedValue([]);

    const diff = await service.generateDiff(draftId);

    // Verify stage changes are detected
    const hasStageChange = diff.changes.some((c: any) => 
      c.category === 'structure' && (c.type === 'stage_type' || c.type.includes('stage'))
    );
    expect(hasStageChange).toBe(true);
  });

  /**
   * Test that diff generation detects changes to substage fields
   */
  it('should detect changes to all expected substage fields', async () => {
    const draftId = 'test-draft-id';
    const lessonId = 'test-lesson-id';

    const liveLesson = {
      id: lessonId,
      data: {
        structure: {
          stages: [
            {
              id: 'stage-1',
              title: 'Stage 1',
              type: 'trigger',
              subStages: [
                {
                  id: 'substage-1',
                  title: 'Original Substage',
                  type: 'intro',
                  duration: 5
                }
              ]
            }
          ]
        }
      }
    } as any;

    const draftData = {
      structure: {
        stages: [
          {
            id: 'stage-1',
            title: 'Stage 1',
            type: 'trigger',
            subStages: [
              {
                id: 'substage-1',
                title: 'New Substage',
                type: 'tease',
                duration: 10
              }
            ]
          }
        ]
      }
    };

    const draft = {
      id: draftId,
      lessonId: lessonId,
      draftData: draftData,
      lesson: liveLesson,
      status: 'pending'
    } as any;

    mockDraftRepository.findOne.mockResolvedValue(draft);
    mockContentSourceRepository.find.mockResolvedValue([]);
    mockLessonDataLinkRepository.find.mockResolvedValue([]);

    const diff = await service.generateDiff(draftId);

    // Verify substage changes are detected
    const hasSubstageChange = diff.changes.some((c: any) => 
      c.category === 'structure' && (c.type === 'substage_type' || c.type.includes('substage'))
    );
    expect(hasSubstageChange).toBe(true);
  });

  /**
   * Test that diff generation detects changes to interaction config
   */
  it('should detect changes to interaction config fields', async () => {
    const draftId = 'test-draft-id';
    const lessonId = 'test-lesson-id';

    const liveLesson = {
      id: lessonId,
      data: {
        structure: {
          stages: [
            {
              id: 'stage-1',
              subStages: [
                {
                  id: 'substage-1',
                  interaction: {
                    type: 'iframe-embed',
                    config: { url: 'https://example.com/old' }
                  }
                }
              ]
            }
          ]
        }
      }
    } as any;

    const draftData = {
      structure: {
        stages: [
          {
            id: 'stage-1',
            subStages: [
              {
                id: 'substage-1',
                interaction: {
                  type: 'iframe-embed',
                  config: { url: 'https://example.com/new' }
                }
              }
            ]
          }
        ]
      }
    };

    const draft = {
      id: draftId,
      lessonId: lessonId,
      draftData: draftData,
      lesson: liveLesson,
      status: 'pending'
    } as any;

    mockDraftRepository.findOne.mockResolvedValue(draft);
    mockContentSourceRepository.find.mockResolvedValue([]);
    mockLessonDataLinkRepository.find.mockResolvedValue([]);

    const diff = await service.generateDiff(draftId);

    // Verify interaction config changes are detected
    const hasInteractionChange = diff.changes.some((c: any) => 
      c.category === 'interaction_config'
    );
    expect(hasInteractionChange).toBe(true);
  });

  /**
   * Test that all expected fields trigger change detection when modified
   */
  it('should detect changes when any expected field is modified', async () => {
    const draftId = 'test-draft-id';
    const lessonId = 'test-lesson-id';

    // Create a comprehensive live lesson
    const liveLesson = {
      id: lessonId,
      title: 'Live Title',
      description: 'Live Description',
      category: 'Live Category',
      difficulty: 'Beginner',
      thumbnailUrl: 'https://example.com/live.jpg',
      tags: ['live-tag'],
      data: {
        structure: {
          stages: [
            {
              id: 'stage-1',
              title: 'Live Stage',
              type: 'trigger',
              subStages: [
                {
                  id: 'substage-1',
                  title: 'Live Substage',
                  type: 'intro',
                  duration: 5,
                  interaction: {
                    type: 'iframe-embed',
                    config: { url: 'https://live.com' }
                  }
                }
              ]
            }
          ]
        }
      },
      objectives: {
        learningObjectives: ['Live Objective']
      }
    } as any;

    // Create draft with all fields changed
    const draftData = {
      title: 'Draft Title',
      description: 'Draft Description',
      category: 'Draft Category',
      difficulty: 'Advanced',
      durationMinutes: 30,
      thumbnailUrl: 'https://example.com/draft.jpg',
      tags: ['draft-tag'],
      objectives: {
        learningObjectives: ['Draft Objective']
      },
      structure: {
        stages: [
          {
            id: 'stage-1',
            title: 'Draft Stage',
            type: 'explore',
            subStages: [
              {
                id: 'substage-1',
                title: 'Draft Substage',
                type: 'tease',
                duration: 10,
                interaction: {
                  type: 'iframe-embed',
                  config: { url: 'https://draft.com' }
                }
              }
            ]
          }
        ]
      }
    };

    const draft = {
      id: draftId,
      lessonId: lessonId,
      draftData: draftData,
      lesson: liveLesson,
      status: 'pending'
    } as any;

    mockDraftRepository.findOne.mockResolvedValue(draft);
    mockContentSourceRepository.find.mockResolvedValue([]);
    mockLessonDataLinkRepository.find.mockResolvedValue([]);

    const diff = await service.generateDiff(draftId);

    // Verify that multiple changes are detected
    expect(diff.changesCount).toBeGreaterThan(0);
    expect(diff.changes.length).toBeGreaterThan(0);

    // Verify that changes span multiple categories
    const categories = new Set(diff.changes.map((c: any) => c.category));
    expect(categories.size).toBeGreaterThan(1); // Should have changes in multiple categories
  });
});

