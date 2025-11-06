# Upora Lesson JSON Schema

## Complete Lesson Data Structure

This document defines the comprehensive JSON schema for storing and loading complete lessons in Upora. Every lesson should be fully reconstructable from this JSON blob.

## Root Lesson Object

```typescript
interface LessonData {
  // Lesson Metadata
  metadata: {
    version: string;           // Schema version (e.g., "1.0")
    created: string;          // ISO timestamp
    updated: string;          // ISO timestamp
    lessonId: string;         // UUID of the lesson
    tenantId: string;         // Tenant isolation
    createdBy: string;        // User ID who created
  };

  // Lesson Configuration
  config: {
    title: string;
    description: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    durationMinutes: number;
    thumbnailUrl?: string;
    tags: string[];
    status: 'draft' | 'pending' | 'approved' | 'rejected';
  };

  // AI Context & Prompts
  aiContext: {
    generalPrompt: string;                    // Main lesson AI teacher prompt
    defaultSubStagePrompts: {                  // Default prompts for each substage type
      [substageType: string]: string;
    };
    customPrompts: {                           // Custom prompts per substage
      [substageId: string]: string;
    };
    contextData: {                            // Additional context for AI
      lessonObjectives: string[];
      prerequisites: string[];
      keyConcepts: string[];
    };
  };

  // Lesson Structure (TEACH Methodology)
  structure: {
    stages: Stage[];
    totalDuration: number;                    // Calculated total duration
    learningObjectives: string[];             // Overall lesson goals
  };

  // Content Library References
  contentReferences: {
    contentSources: ContentSourceReference[];  // Links to user's content library
    mediaAssets: MediaAssetReference[];       // Audio, video, images
  };

  // Processed Content (Embedded JSON Data)
  processedContent: {
    [contentId: string]: ProcessedContentData; // All processed data embedded
  };

  // Interaction Configuration
  interactions: {
    interactionTypes: InteractionTypeConfig[];
    customInteractions: CustomInteractionConfig[];
  };

  // Script & Timing
  script: {
    blocks: ScriptBlock[];
    totalDuration: number;                    // Total script duration
    timing: TimingConfig;
  };

  // Assessment & Progress
  assessment: {
    checkpoints: Checkpoint[];
    evaluationCriteria: EvaluationCriteria[];
    progressTracking: ProgressConfig;
  };
}

// Stage Structure (TEACH Methodology)
interface Stage {
  id: string;
  title: string;
  type: 'trigger' | 'explore' | 'absorb' | 'cultivate' | 'hone';
  description: string;
  duration: number;                          // Minutes
  order: number;                             // Stage sequence
  subStages: SubStage[];
  aiPrompt?: string;                         // Custom AI prompt for this stage
  prerequisites?: string[];                  // Required previous stages
}

interface SubStage {
  id: string;
  title: string;
  type: string;                              // Specific substage type
  duration: number;                          // Minutes
  order: number;                             // Order within stage
  interactionType: string;                   // Type of interaction
  contentOutputId?: string;                  // Reference to processed content
  scriptBlocks: ScriptBlock[];
  aiPrompt?: string;                         // Custom AI prompt for this substage
  prerequisites?: string[];                  // Required previous substages
  metadata: {
    learningObjectives: string[];
    keyPoints: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  };
}

// Script Blocks with Timing
interface ScriptBlock {
  id: string;
  type: 'teacher_talk' | 'load_interaction' | 'pause' | 'ai_response' | 'user_input';
  content: string;
  startTime: number;                         // Seconds from lesson start
  endTime: number;                           // Seconds from lesson start
  duration: number;                          // Calculated duration
  order: number;                             // Sequence within substage
  metadata: {
    speaker?: 'teacher' | 'ai' | 'student';
    interactionId?: string;                  // If type is 'load_interaction'
    aiPrompt?: string;                       // Custom prompt for AI responses
    expectedResponse?: string;               // Expected student response
  };
}

// Content Library References
interface ContentSourceReference {
  id: string;                                // Content source ID
  type: 'url' | 'file' | 'text' | 'pdf' | 'image' | 'video' | 'audio';
  title: string;
  sourceUrl?: string;                        // Original URL
  filePath?: string;                         // S3 file path
  summary: string;                           // AI-generated summary
  weaviateId?: string;                       // Vector database ID
  relevanceScore?: number;                   // Relevance to lesson
  metadata: {
    topics: string[];
    keywords: string[];
    difficulty: string;
    language: string;
  };
}

// Processed Content Data (Embedded in JSON)
interface ProcessedContentData {
  id: string;                                // Unique content ID
  name: string;                              // Human-readable name
  type: ProcessedContentType;                // Strict type for validation
  sourceContentId?: string;                   // Optional: source content reference
  workflowName?: string;                     // Optional: N8N workflow used
  createdBy: string;                         // User who created this
  createdAt: string;                         // ISO timestamp
  data: ProcessedContentDataPayload;         // The actual processed data
  metadata: {
    quality: number;                          // 1-10 quality score
    confidence: number;                       // AI confidence score
    tags: string[];
    validationStatus: 'valid' | 'invalid' | 'pending';
    validationErrors?: string[];             // If validation failed
  };
}

// Strict content types with validation schemas
type ProcessedContentType = 
  | 'qa_pairs' 
  | 'summary' 
  | 'facts' 
  | 'exercises' 
  | 'quiz' 
  | 'code_examples'
  | 'interactive_demo'
  | 'assessment_questions'
  | 'custom';

// Type-specific data payloads (enforced by interaction types)
interface ProcessedContentDataPayload {
  // QA Pairs
  qa_pairs?: {
    questions: Array<{
      id: string;
      question: string;
      answer: string;
      explanation?: string;
      difficulty: 'easy' | 'medium' | 'hard';
      tags: string[];
    }>;
  };

  // Summary
  summary?: {
    text: string;
    keyPoints: string[];
    wordCount: number;
    readingTime: number; // minutes
  };

  // Facts
  facts?: {
    items: Array<{
      id: string;
      fact: string;
      source?: string;
      category: string;
      importance: 'low' | 'medium' | 'high';
    }>;
  };

  // Exercises
  exercises?: {
    problems: Array<{
      id: string;
      title: string;
      description: string;
      instructions: string;
      starterCode?: string;
      solution: string;
      testCases: Array<{
        input: any;
        expectedOutput: any;
        description: string;
      }>;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      estimatedTime: number; // minutes
    }>;
  };

  // Quiz
  quiz?: {
    questions: Array<{
      id: string;
      type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'code_completion';
      question: string;
      options?: string[]; // For multiple choice
      correctAnswer: string | string[];
      explanation: string;
      points: number;
      timeLimit?: number; // seconds
    }>;
    totalPoints: number;
    passingScore: number; // percentage
  };

  // Code Examples
  code_examples?: {
    examples: Array<{
      id: string;
      title: string;
      description: string;
      language: string;
      code: string;
      explanation: string;
      runnable: boolean;
      dependencies?: string[];
    }>;
  };

  // Interactive Demo
  interactive_demo?: {
    title: string;
    description: string;
    type: 'pixi_interaction' | 'code_editor' | 'simulation';
    config: any; // Interaction-specific configuration
    assets: string[]; // Media asset IDs
    steps: Array<{
      id: string;
      title: string;
      instructions: string;
      expectedOutcome: string;
    }>;
  };

  // Assessment Questions
  assessment_questions?: {
    questions: Array<{
      id: string;
      type: 'knowledge' | 'application' | 'analysis' | 'synthesis';
      question: string;
      rubric: {
        criteria: Array<{
          description: string;
          points: number;
          examples?: string[];
        }>;
      };
      sampleAnswers?: Array<{
        level: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
        answer: string;
        explanation: string;
      }>;
    }>;
  };

  // Custom (for extensibility)
  custom?: {
    schema: string; // JSON schema for validation
    data: any; // Custom data structure
  };
}

interface MediaAssetReference {
  id: string;
  type: 'audio' | 'video' | 'image' | 'animation';
  title: string;
  url: string;                               // S3 URL or external URL
  duration?: number;                          // For audio/video
  size?: number;                             // File size in bytes
  format: string;                            // File format (mp3, mp4, png, etc.)
  metadata: {
    description: string;
    altText?: string;                        // For accessibility
    captions?: string;                       // For video/audio
    transcript?: string;                     // For audio/video
  };
}

// Interaction Configuration
interface InteractionTypeConfig {
  id: string;
  name: string;
  type: string;                              // Built-in or custom
  config: any;                               // Interaction-specific config
  assets: MediaAssetReference[];             // Required media assets
  metadata: {
    description: string;
    difficulty: string;
    estimatedDuration: number;
  };
  // Content Type Validation
  acceptedContentTypes: ProcessedContentType[]; // What content types this interaction can use
  contentValidation: {
    [contentType: string]: {
      required: string[];                     // Required fields
      optional: string[];                     // Optional fields
      validationRules: ValidationRule[];      // Custom validation rules
    };
  };
}

interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: string;                   // Function name for custom validation
}

interface CustomInteractionConfig {
  id: string;
  name: string;
  pixiConfig: any;                           // Pixi.js configuration
  n8nWorkflowId?: string;                   // Associated workflow
  assets: MediaAssetReference[];
  metadata: {
    createdBy: string;
    version: string;
    description: string;
  };
}

// Assessment & Progress
interface Checkpoint {
  id: string;
  title: string;
  type: 'knowledge' | 'skill' | 'comprehension' | 'application';
  substageId: string;                        // Which substage this belongs to
  questions: Question[];
  passingScore: number;                      // Percentage required
  metadata: {
    weight: number;                          // Importance in overall assessment
    timeLimit?: number;                      // Seconds
  };
}

interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'essay' | 'interactive';
  question: string;
  options?: string[];                        // For multiple choice
  correctAnswer: string | string[];          // Correct answer(s)
  explanation: string;                       // Why this is correct
  points: number;                            // Point value
  metadata: {
    difficulty: string;
    tags: string[];
  };
}

interface EvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;                            // 0-1 weight in final score
  criteria: {
    [key: string]: {
      description: string;
      points: number;
    };
  };
}

interface ProgressConfig {
  trackTime: boolean;                        // Track time spent
  trackInteractions: boolean;                // Track interaction completions
  trackAssessments: boolean;                 // Track assessment scores
  milestones: Milestone[];                  // Progress milestones
}

interface Milestone {
  id: string;
  name: string;
  description: string;
  trigger: 'completion' | 'score' | 'time' | 'interaction';
  threshold: number;                         // Value needed to trigger
  reward?: string;                           // Optional reward message
}

// Timing Configuration
interface TimingConfig {
  autoAdvance: boolean;                      // Auto-advance through stages
  pauseBetweenStages: number;                // Seconds to pause
  allowBacktracking: boolean;                // Allow going back
  timeLimit?: number;                        // Overall time limit (minutes)
  warnings: {
    timeRemaining: number[];                 // Warning times (minutes)
    messages: string[];                      // Warning messages
  };
}
```

## Example Complete Lesson JSON

```json
{
  "metadata": {
    "version": "1.0",
    "created": "2024-01-15T10:30:00Z",
    "updated": "2024-01-15T14:45:00Z",
    "lessonId": "30000000-0000-0000-0000-000000000002",
    "tenantId": "00000000-0000-0000-0000-000000000001",
    "createdBy": "00000000-0000-0000-0000-000000000011"
  },
  "config": {
    "title": "JavaScript Fundamentals",
    "description": "Master JavaScript with hands-on examples",
    "category": "Programming",
    "difficulty": "Beginner",
    "durationMinutes": 60,
    "thumbnailUrl": "https://images.unsplash.com/photo-1579468118864-1b...",
    "tags": ["javascript", "programming", "web-development"],
    "status": "approved"
  },
  "aiContext": {
    "generalPrompt": "You are an expert JavaScript teacher. Help students learn through interactive examples and clear explanations.",
    "defaultSubStagePrompts": {
      "introduction": "Introduce the concept clearly and provide context.",
      "example": "Show a practical example with step-by-step explanation.",
      "practice": "Guide the student through hands-on practice.",
      "assessment": "Evaluate the student's understanding and provide feedback."
    },
    "customPrompts": {
      "substage_001": "Focus on variable declarations and hoisting concepts."
    },
    "contextData": {
      "lessonObjectives": [
        "Understand JavaScript variables and data types",
        "Learn about functions and scope",
        "Practice with interactive coding exercises"
      ],
      "prerequisites": ["Basic HTML knowledge", "Text editor familiarity"],
      "keyConcepts": ["Variables", "Functions", "Scope", "Data Types"]
    }
  },
  "structure": {
    "stages": [
      {
        "id": "stage_001",
        "title": "Introduction to Variables",
        "type": "trigger",
        "description": "Learn the basics of JavaScript variables",
        "duration": 15,
        "order": 1,
        "subStages": [
          {
            "id": "substage_001",
            "title": "What are Variables?",
            "type": "introduction",
            "duration": 5,
            "order": 1,
            "interactionType": "interactive_explanation",
            "contentOutputId": "output_001",
            "scriptBlocks": [
              {
                "id": "script_001",
                "type": "teacher_talk",
                "content": "Welcome! Today we'll learn about JavaScript variables.",
                "startTime": 0,
                "endTime": 10,
                "duration": 10,
                "order": 1,
                "metadata": {
                  "speaker": "teacher"
                }
              }
            ],
            "aiPrompt": "Focus on variable declarations and hoisting concepts.",
            "metadata": {
              "learningObjectives": ["Understand what variables are"],
              "keyPoints": ["Variables store data", "Declaration vs assignment"],
              "difficulty": "easy"
            }
          }
        ]
      }
    ],
    "totalDuration": 60,
    "learningObjectives": [
      "Master JavaScript variable concepts",
      "Understand function scope and hoisting",
      "Complete interactive coding challenges"
    ]
  },
  "contentReferences": {
    "contentSources": [
      {
        "id": "content_001",
        "type": "url",
        "title": "MDN JavaScript Variables Guide",
        "sourceUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Variables",
        "summary": "Comprehensive guide to JavaScript variables from Mozilla",
        "weaviateId": "weaviate_001",
        "relevanceScore": 0.95,
        "metadata": {
          "topics": ["variables", "javascript", "programming"],
          "keywords": ["var", "let", "const", "declaration"],
          "difficulty": "beginner",
          "language": "en"
        }
      }
    ],
    "mediaAssets": [
      {
        "id": "media_001",
        "type": "video",
        "title": "JavaScript Variables Explained",
        "url": "https://s3.amazonaws.com/upora-media/videos/js-variables.mp4",
        "duration": 180,
        "size": 15728640,
        "format": "mp4",
        "metadata": {
          "description": "Short video explaining JavaScript variables",
          "captions": "https://s3.amazonaws.com/upora-media/captions/js-variables.vtt",
          "transcript": "In this video, we'll explore JavaScript variables..."
        }
      }
    ]
  },

  "processedContent": {
    "content_001": {
      "id": "content_001",
      "name": "JavaScript Variables Q&A Set",
      "type": "qa_pairs",
      "sourceContentId": "content_001",
      "workflowName": "content_processor_v1",
      "createdBy": "00000000-0000-0000-0000-000000000011",
      "createdAt": "2024-01-15T10:30:00Z",
      "data": {
        "qa_pairs": {
          "questions": [
            {
              "id": "q1",
              "question": "What is a variable in JavaScript?",
              "answer": "A variable is a container that stores data values and can be referenced by a name.",
              "explanation": "Variables are fundamental to programming and allow us to store and manipulate data.",
              "difficulty": "easy",
              "tags": ["variables", "basics", "fundamentals"]
            },
            {
              "id": "q2",
              "question": "What are the three ways to declare a variable in JavaScript?",
              "answer": "var, let, and const",
              "explanation": "Each has different scoping rules: var is function-scoped, let and const are block-scoped.",
              "difficulty": "medium",
              "tags": ["declaration", "scope", "keywords"]
            }
          ]
        }
      },
      "metadata": {
        "quality": 9,
        "confidence": 0.95,
        "tags": ["variables", "javascript", "qa"],
        "validationStatus": "valid"
      }
    },
    "content_002": {
      "id": "content_002",
      "name": "JavaScript Variables Summary",
      "type": "summary",
      "sourceContentId": "content_001",
      "createdBy": "00000000-0000-0000-0000-000000000011",
      "createdAt": "2024-01-15T10:35:00Z",
      "data": {
        "summary": {
          "text": "JavaScript variables are containers for storing data values. They can be declared using var, let, or const keywords, each with different scoping rules and behaviors.",
          "keyPoints": [
            "Variables store data values",
            "Three declaration keywords: var, let, const",
            "Different scoping rules apply",
            "const prevents reassignment"
          ],
          "wordCount": 45,
          "readingTime": 1
        }
      },
      "metadata": {
        "quality": 8,
        "confidence": 0.92,
        "tags": ["summary", "variables", "overview"],
        "validationStatus": "valid"
      }
    },
    "content_003": {
      "id": "content_003",
      "name": "Variable Declaration Exercise",
      "type": "exercises",
      "createdBy": "00000000-0000-0000-0000-000000000011",
      "createdAt": "2024-01-15T10:40:00Z",
      "data": {
        "exercises": {
          "problems": [
            {
              "id": "ex1",
              "title": "Declare Your First Variable",
              "description": "Create a variable to store your name",
              "instructions": "Use the 'let' keyword to declare a variable called 'myName' and assign your name to it.",
              "starterCode": "// Your code here",
              "solution": "let myName = 'John';",
              "testCases": [
                {
                  "input": "myName",
                  "expectedOutput": "string",
                  "description": "Variable should be a string type"
                }
              ],
              "difficulty": "beginner",
              "estimatedTime": 5
            }
          ]
        }
      },
      "metadata": {
        "quality": 9,
        "confidence": 0.98,
        "tags": ["exercise", "practice", "variables"],
        "validationStatus": "valid"
      }
    }
  },
  "interactions": {
    "interactionTypes": [
      {
        "id": "interaction_001",
        "name": "Code Editor",
        "type": "builtin",
        "config": {
          "language": "javascript",
          "theme": "monokai",
          "features": ["syntax_highlighting", "auto_complete", "error_detection"]
        },
        "assets": [],
        "metadata": {
          "description": "Interactive JavaScript code editor",
          "difficulty": "beginner",
          "estimatedDuration": 300
        }
      }
    ],
    "customInteractions": []
  },
  "script": {
    "blocks": [
      {
        "id": "script_001",
        "type": "teacher_talk",
        "content": "Welcome! Today we'll learn about JavaScript variables.",
        "startTime": 0,
        "endTime": 10,
        "duration": 10,
        "order": 1,
        "metadata": {
          "speaker": "teacher"
        }
      }
    ],
    "totalDuration": 3600,
    "timing": {
      "autoAdvance": false,
      "pauseBetweenStages": 5,
      "allowBacktracking": true,
      "timeLimit": 90,
      "warnings": {
        "timeRemaining": [15, 5],
        "messages": ["15 minutes remaining", "5 minutes remaining"]
      }
    }
  },
  "assessment": {
    "checkpoints": [
      {
        "id": "checkpoint_001",
        "title": "Variable Knowledge Check",
        "type": "knowledge",
        "substageId": "substage_001",
        "questions": [
          {
            "id": "q_001",
            "type": "multiple_choice",
            "question": "Which keyword is used to declare a variable in JavaScript?",
            "options": ["var", "let", "const", "All of the above"],
            "correctAnswer": "All of the above",
            "explanation": "JavaScript supports var, let, and const for variable declaration.",
            "points": 10,
            "metadata": {
              "difficulty": "easy",
              "tags": ["variables", "declaration"]
            }
          }
        ],
        "passingScore": 70,
        "metadata": {
          "weight": 0.3,
          "timeLimit": 300
        }
      }
    ],
    "evaluationCriteria": [
      {
        "id": "criteria_001",
        "name": "JavaScript Fundamentals",
        "description": "Understanding of basic JavaScript concepts",
        "weight": 1.0,
        "criteria": {
          "variable_declaration": {
            "description": "Can declare variables correctly",
            "points": 25
          },
          "data_types": {
            "description": "Understands different data types",
            "points": 25
          }
        }
      }
    ],
    "progressTracking": {
      "trackTime": true,
      "trackInteractions": true,
      "trackAssessments": true,
      "milestones": [
        {
          "id": "milestone_001",
          "name": "Variables Mastered",
          "description": "Successfully completed variable concepts",
          "trigger": "score",
          "threshold": 80,
          "reward": "Great job! You've mastered JavaScript variables!"
        }
      ]
    }
  }
}
```

## Content Validation System

### Interaction Type Content Validation

Each interaction type defines strict validation rules for the content it can use:

```typescript
// Example: Quiz Interaction Type
{
  "id": "quiz_interaction",
  "name": "Interactive Quiz",
  "acceptedContentTypes": ["quiz", "qa_pairs"],
  "contentValidation": {
    "quiz": {
      "required": ["questions", "totalPoints", "passingScore"],
      "optional": ["timeLimit"],
      "validationRules": [
        {
          "field": "questions",
          "type": "array",
          "required": true,
          "minLength": 1
        },
        {
          "field": "totalPoints",
          "type": "number",
          "required": true
        }
      ]
    },
    "qa_pairs": {
      "required": ["questions"],
      "optional": [],
      "validationRules": [
        {
          "field": "questions",
          "type": "array",
          "required": true,
          "minLength": 1
        }
      ]
    }
  }
}

// Example: Code Editor Interaction Type
{
  "id": "code_editor",
  "name": "Interactive Code Editor",
  "acceptedContentTypes": ["exercises", "code_examples"],
  "contentValidation": {
    "exercises": {
      "required": ["problems"],
      "optional": [],
      "validationRules": [
        {
          "field": "problems",
          "type": "array",
          "required": true,
          "minLength": 1
        },
        {
          "field": "problems[].solution",
          "type": "string",
          "required": true,
          "minLength": 1
        }
      ]
    }
  }
}
```

### Validation Process

1. **Content Type Check**: Verify the content type is accepted by the interaction
2. **Required Fields**: Ensure all required fields are present
3. **Data Type Validation**: Check field types match expected types
4. **Custom Rules**: Apply interaction-specific validation rules
5. **Error Reporting**: Return detailed validation errors for fixes

### Error Handling

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

// Example validation errors:
// {
//   "isValid": false,
//   "errors": [
//     {
//       "field": "questions",
//       "message": "Quiz must have at least 1 question",
//       "code": "MIN_LENGTH_VIOLATION",
//       "severity": "error"
//     }
//   ]
// }
```

## Key Benefits of This Schema

1. **Complete Reconstructability**: Every aspect of the lesson can be rebuilt from this JSON
2. **Embedded Processed Content**: All processed data is stored directly in the JSON, not just references
3. **Strict Content Validation**: Interaction types enforce correct content structure with detailed error reporting
4. **AI Context Management**: Comprehensive prompt system with defaults and customizations
5. **Content Library Integration**: Full references to user's content with embedded processed outputs
6. **Media Asset Management**: Complete media handling with accessibility features
7. **Assessment Integration**: Built-in progress tracking and evaluation
8. **Timing & Scripting**: Precise control over lesson flow and timing
9. **Extensibility**: Easy to add new features without breaking existing lessons
10. **Type Safety**: Strict typing prevents invalid content from being used with wrong interactions

## Implementation Notes

- **Version Control**: Schema versioning allows backward compatibility
- **Tenant Isolation**: All IDs include tenant context
- **Performance**: Large media assets are referenced, not embedded
- **Accessibility**: Captions, transcripts, and alt text included
- **AI Integration**: Comprehensive prompt system for different contexts
- **Assessment**: Built-in progress tracking and evaluation criteria
