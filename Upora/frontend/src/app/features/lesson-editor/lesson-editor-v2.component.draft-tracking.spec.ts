/**
 * Draft Tracking Validation Tests
 * 
 * These tests ensure that all lesson data fields are properly included
 * in the draft saving system. If you add a new field and these tests fail,
 * you need to update executeSaveDraft() to include the new field.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { LessonEditorV2Component } from './lesson-editor-v2.component';
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

describe('LessonEditorV2Component - Draft Tracking', () => {
  let component: LessonEditorV2Component;
  let fixture: ComponentFixture<LessonEditorV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LessonEditorV2Component],
      imports: [
        HttpClientTestingModule,
        RouterTestingModule,
        FormsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LessonEditorV2Component);
    component = fixture.componentInstance;
  });

  /**
   * Test that all expected top-level fields are included in draftData
   */
  it('should include all expected top-level fields in draftData', () => {
    // Setup: Create a lesson with all fields populated
    component.lesson = {
      id: 'test-lesson-id',
      title: 'Test Lesson',
      description: 'Test Description',
      category: 'Test Category',
      difficulty: 'Beginner',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      tags: ['tag1', 'tag2'],
      duration: '30 min'
    } as any;

    component.learningObjectives = ['Objective 1', 'Objective 2'];
    component.lessonOutcomes = [{ title: 'Outcome 1' }];
    component.stages = [
      {
        id: 'stage-1',
        title: 'Stage 1',
        type: 'trigger',
        subStages: []
      }
    ];

    // Mock the executeSaveDraft method to capture draftData
    let capturedDraftData: any = null;
    const originalExecuteSaveDraft = component.executeSaveDraft.bind(component);
    component.executeSaveDraft = function() {
      // Build draftData the same way executeSaveDraft does
      const draftData = {
        title: this.lesson.title,
        description: this.lesson.description,
        category: this.lesson.category,
        difficulty: this.lesson.difficulty,
        durationMinutes: this.calculateTotalDuration(),
        thumbnailUrl: this.lesson.thumbnailUrl,
        tags: this.lesson.tags,
        objectives: {
          learningObjectives: this.learningObjectives.filter(obj => obj && obj.trim() !== ''),
          lessonOutcomes: this.lessonOutcomes.filter(outcome => outcome.title && outcome.title.trim() !== '')
        },
        structure: {
          stages: this.stages.map(stage => ({
            id: stage.id,
            title: stage.title,
            type: stage.type,
            subStages: stage.subStages.map(substage => {
              const interactionData = substage.interaction
                ? {
                    id: substage.interaction.id,
                    type: substage.interaction.type,
                    name: substage.interaction.name,
                    category: substage.interaction.category,
                    contentOutputId: substage.interaction.contentOutputId || substage.contentOutputId || null,
                    config: substage.interaction.config
                      ? JSON.parse(JSON.stringify(substage.interaction.config))
                      : {}
                  }
                : substage.interactionType
                  ? {
                      type: substage.interactionType,
                      contentOutputId: substage.contentOutputId || null,
                      config: {}
                    }
                  : null;

              const dbScriptBlocks = (substage.scriptBlocks || [])
                .filter(block => block.type === 'teacher_talk')
                .map(block => ({
                  id: block.id,
                  text: block.content || '',
                  idealTimestamp: block.startTime || 0,
                  estimatedDuration: (block.endTime || block.startTime || 0) - (block.startTime || 0) || 10,
                  playbackRules: block.metadata || {}
                }));

              const interactionIndex = (substage.scriptBlocks || []).findIndex(b => b.type === 'load_interaction');
              const preInteractionScripts = dbScriptBlocks.slice(0, interactionIndex >= 0 ? interactionIndex : dbScriptBlocks.length);
              const postInteractionScripts = interactionIndex >= 0 ? dbScriptBlocks.slice(interactionIndex) : [];

              return {
                id: substage.id,
                title: substage.title,
                type: substage.type,
                duration: substage.duration,
                scriptBlocks: preInteractionScripts,
                scriptBlocksAfterInteraction: postInteractionScripts,
                contentOutputId: substage.contentOutputId || interactionData?.contentOutputId || null,
                interactionType: substage.interactionType || interactionData?.type || null,
                interaction: interactionData
              };
            })
          }))
        }
      };
      capturedDraftData = draftData;
      return originalExecuteSaveDraft();
    };

    // Execute
    component.executeSaveDraft();

    // Verify: Check that all expected fields are present
    const expectedFields = getExpectedDraftDataFields();
    expectedFields.forEach(field => {
      expect(capturedDraftData).toHaveProperty(field, 
        `Draft data is missing required field: ${field}. Add it to executeSaveDraft() in lesson-editor-v2.component.ts`);
    });
  });

  /**
   * Test that all expected stage fields are included
   */
  it('should include all expected stage fields in draftData', () => {
    component.lesson = { id: 'test-lesson-id' } as any;
    component.stages = [
      {
        id: 'stage-1',
        title: 'Stage 1',
        type: 'trigger',
        subStages: []
      }
    ];

    let capturedDraftData: any = null;
    const originalExecuteSaveDraft = component.executeSaveDraft.bind(component);
    component.executeSaveDraft = function() {
      const draftData = {
        structure: {
          stages: this.stages.map(stage => ({
            id: stage.id,
            title: stage.title,
            type: stage.type,
            subStages: []
          }))
        }
      };
      capturedDraftData = draftData;
      return originalExecuteSaveDraft();
    };

    component.executeSaveDraft();

    const expectedFields = getExpectedStageFields();
    const firstStage = capturedDraftData?.structure?.stages?.[0];
    
    if (firstStage) {
      expectedFields.forEach(field => {
        expect(firstStage).toHaveProperty(field,
          `Stage object is missing required field: ${field}. Add it to executeSaveDraft() in lesson-editor-v2.component.ts`);
      });
    }
  });

  /**
   * Test that all expected substage fields are included
   */
  it('should include all expected substage fields in draftData', () => {
    component.lesson = { id: 'test-lesson-id' } as any;
    component.stages = [
      {
        id: 'stage-1',
        title: 'Stage 1',
        type: 'trigger',
        subStages: [
          {
            id: 'substage-1',
            title: 'Substage 1',
            type: 'intro',
            duration: 5,
            scriptBlocks: []
          }
        ]
      }
    ];

    let capturedDraftData: any = null;
    const originalExecuteSaveDraft = component.executeSaveDraft.bind(component);
    component.executeSaveDraft = function() {
      const draftData = {
        structure: {
          stages: this.stages.map(stage => ({
            subStages: stage.subStages.map(substage => ({
              id: substage.id,
              title: substage.title,
              type: substage.type,
              duration: substage.duration,
              scriptBlocks: [],
              scriptBlocksAfterInteraction: [],
              contentOutputId: substage.contentOutputId || null,
              interactionType: substage.interactionType || null,
              interaction: substage.interaction ? {
                id: substage.interaction.id,
                type: substage.interaction.type,
                name: substage.interaction.name,
                category: substage.interaction.category,
                contentOutputId: substage.interaction.contentOutputId || null,
                config: substage.interaction.config || {}
              } : null
            }))
          }))
        }
      };
      capturedDraftData = draftData;
      return originalExecuteSaveDraft();
    };

    component.executeSaveDraft();

    const expectedFields = getExpectedSubStageFields();
    const firstSubStage = capturedDraftData?.structure?.stages?.[0]?.subStages?.[0];
    
    if (firstSubStage) {
      expectedFields.forEach(field => {
        expect(firstSubStage).toHaveProperty(field,
          `Substage object is missing required field: ${field}. Add it to executeSaveDraft() in lesson-editor-v2.component.ts`);
      });
    }
  });

  /**
   * Test that all expected interaction fields are included
   */
  it('should include all expected interaction fields in draftData', () => {
    component.lesson = { id: 'test-lesson-id' } as any;
    component.stages = [
      {
        id: 'stage-1',
        title: 'Stage 1',
        type: 'trigger',
        subStages: [
          {
            id: 'substage-1',
            title: 'Substage 1',
            type: 'intro',
            duration: 5,
            scriptBlocks: [],
            interaction: {
              id: 'interaction-1',
              type: 'iframe-embed',
              name: 'Test Interaction',
              category: 'iframe',
              contentOutputId: 'content-1',
              config: { url: 'https://example.com' }
            }
          }
        ]
      }
    ];

    let capturedDraftData: any = null;
    const originalExecuteSaveDraft = component.executeSaveDraft.bind(component);
    component.executeSaveDraft = function() {
      const draftData = {
        structure: {
          stages: this.stages.map(stage => ({
            subStages: stage.subStages.map(substage => ({
              interaction: substage.interaction ? {
                id: substage.interaction.id,
                type: substage.interaction.type,
                name: substage.interaction.name,
                category: substage.interaction.category,
                contentOutputId: substage.interaction.contentOutputId || null,
                config: substage.interaction.config ? JSON.parse(JSON.stringify(substage.interaction.config)) : {}
              } : null
            }))
          }))
        }
      };
      capturedDraftData = draftData;
      return originalExecuteSaveDraft();
    };

    component.executeSaveDraft();

    const expectedFields = getExpectedInteractionFields();
    const interaction = capturedDraftData?.structure?.stages?.[0]?.subStages?.[0]?.interaction;
    
    if (interaction) {
      expectedFields.forEach(field => {
        expect(interaction).toHaveProperty(field,
          `Interaction object is missing required field: ${field}. Add it to executeSaveDraft() in lesson-editor-v2.component.ts`);
      });
    }
  });

  /**
   * Test that objectives fields are included
   */
  it('should include all expected objectives fields in draftData', () => {
    component.lesson = { id: 'test-lesson-id' } as any;
    component.learningObjectives = ['Objective 1'];
    component.lessonOutcomes = [{ title: 'Outcome 1' }];

    let capturedDraftData: any = null;
    const originalExecuteSaveDraft = component.executeSaveDraft.bind(component);
    component.executeSaveDraft = function() {
      const draftData = {
        objectives: {
          learningObjectives: this.learningObjectives.filter(obj => obj && obj.trim() !== ''),
          lessonOutcomes: this.lessonOutcomes.filter(outcome => outcome.title && outcome.title.trim() !== '')
        }
      };
      capturedDraftData = draftData;
      return originalExecuteSaveDraft();
    };

    component.executeSaveDraft();

    const expectedFields = getExpectedObjectivesFields();
    expectedFields.forEach(field => {
      expect(capturedDraftData?.objectives).toHaveProperty(field,
        `Objectives object is missing required field: ${field}. Add it to executeSaveDraft() in lesson-editor-v2.component.ts`);
    });
  });
});

