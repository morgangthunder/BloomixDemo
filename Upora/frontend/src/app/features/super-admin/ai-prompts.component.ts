import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';

interface AIAssistant {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompts: {
    [key: string]: {
      label: string;
      content: string;
      placeholder: string;
    };
  };
}

@Component({
  selector: 'app-ai-prompts',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  template: `
    <ion-content [style.--padding-top]="'80px'">
      <div class="ai-prompts-page">
        <!-- Header -->
        <div class="page-header">
          <button class="back-btn" (click)="goBack()">
            ← Back to Dashboard
          </button>
          <h1>🧠 AI Assistant Prompts</h1>
          <p class="subtitle">Configure prompts for each AI assistant</p>
        </div>

        <!-- Assistant Selection -->
        <div *ngIf="!selectedAssistant" class="assistants-grid">
          <div *ngFor="let assistant of assistants" 
               class="assistant-card" 
               (click)="selectAssistant(assistant)">
            <div class="assistant-icon">{{ assistant.icon }}</div>
            <div class="assistant-info">
              <h3>{{ assistant.name }}</h3>
              <p>{{ assistant.description }}</p>
            </div>
            <div class="card-arrow">→</div>
          </div>
        </div>

        <!-- Prompt Editor -->
        <div *ngIf="selectedAssistant" class="prompt-editor">
          <div class="editor-header">
            <div class="assistant-title">
              <span class="assistant-icon-large">{{ selectedAssistant.icon }}</span>
              <div>
                <h2>{{ selectedAssistant.name }}</h2>
                <p>{{ selectedAssistant.description }}</p>
              </div>
            </div>
          </div>

          <div class="prompts-container">
            <div *ngFor="let promptKey of getPromptKeys(selectedAssistant)" class="prompt-section">
              <label class="prompt-label">
                {{ selectedAssistant.prompts[promptKey].label }}
              </label>
              <textarea
                [(ngModel)]="selectedAssistant.prompts[promptKey].content"
                [placeholder]="selectedAssistant.prompts[promptKey].placeholder"
                class="prompt-textarea"
                rows="8"
              ></textarea>
              <div class="char-count">
                {{ selectedAssistant.prompts[promptKey].content.length }} characters
              </div>
            </div>
          </div>

          <div class="editor-actions">
            <button class="btn-secondary" (click)="cancelEdit()" [disabled]="saving">Cancel</button>
            <button class="btn-primary" (click)="savePrompts()" [disabled]="saving">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ai-prompts-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      padding: 2rem;
      padding-top: 1rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      margin-bottom: 1rem;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: #00d4ff;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0.5rem 0;
    }

    .subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    /* Assistants Grid */
    .assistants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      max-width: 1200px;
    }

    .assistant-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .assistant-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: #00d4ff;
      transform: translateY(-4px);
      box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
    }

    .assistant-icon {
      font-size: 3rem;
      flex-shrink: 0;
    }

    .assistant-info {
      flex: 1;
    }

    .assistant-info h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
    }

    .assistant-info p {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      line-height: 1.4;
    }

    .card-arrow {
      font-size: 1.5rem;
      color: #00d4ff;
      flex-shrink: 0;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;
    }

    .assistant-card:hover .card-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    /* Prompt Editor */
    .prompt-editor {
      max-width: 1200px;
    }

    .editor-header {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .assistant-title {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .assistant-icon-large {
      font-size: 4rem;
    }

    .assistant-title h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
    }

    .assistant-title p {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }

    .prompts-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .prompt-section {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
    }

    .prompt-label {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      color: #00d4ff;
      margin-bottom: 1rem;
    }

    .prompt-textarea {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 1rem;
      color: #ffffff;
      font-size: 0.875rem;
      font-family: 'Courier New', monospace;
      line-height: 1.6;
      resize: vertical;
      min-height: 150px;
    }

    .prompt-textarea:focus {
      outline: none;
      border-color: #00d4ff;
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.2);
    }

    .prompt-textarea::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .char-count {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 0.5rem;
      text-align: right;
    }

    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 2rem 0;
    }

    .btn-secondary, .btn-primary {
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .btn-primary {
      background: #00d4ff;
      border: none;
      color: #0f0f23;
    }

    .btn-primary:hover {
      background: #00bce6;
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .ai-prompts-page {
        padding: 1rem;
      }

      .assistants-grid {
        grid-template-columns: 1fr;
      }

      .assistant-card {
        padding: 1.5rem;
      }

      .editor-header, .prompt-section {
        padding: 1.5rem;
      }

      .assistant-title {
        flex-direction: column;
        align-items: flex-start;
      }

      .editor-actions {
        flex-direction: column;
      }

      .btn-secondary, .btn-primary {
        width: 100%;
      }
    }
  `]
})
export class AiPromptsComponent implements OnInit {
  selectedAssistant: AIAssistant | null = null;
  assistants: AIAssistant[] = [
    {
      id: 'auto-populator',
      name: 'Auto-Populator',
      icon: '✨',
      description: 'Automatically generates titles, summaries, and topics when adding content sources (PDF, URL, text, image)',
      prompts: {
        textAutoPopulate: {
          label: 'Text Content Auto-Populate Prompt',
          content: 'You are helping a user create educational content from raw text. Analyze the text and generate a concise title, summary, and relevant topics.\n\nGiven the text content, generate:\n1. **Title**: A clear, descriptive title (max 100 characters)\n2. **Summary**: A 2-3 sentence summary of the main points\n3. **Topics**: Maximum 4 relevant topic tags\n\nGuidelines:\n- Title should be informative and engaging\n- Summary should capture the essence without jargon\n- Topics should be general categories (e.g., "Science", "Biology", "Cells") not overly specific\n- Maximum 4 topics\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3", "topic4"]\n}',
          placeholder: 'Enter the prompt for auto-populating text content fields...'
        },
        pdfAutoPopulate: {
          label: 'PDF Auto-Populate Prompt',
          content: 'You are helping a user catalog a PDF document. Analyze the extracted text and generate metadata.\n\nGiven the PDF content, generate:\n1. **Title**: Document title based on content (max 100 characters)\n2. **Summary**: Brief overview of the document\'s purpose\n3. **Topics**: 3-5 subject categories\n\nConsider:\n- Academic papers: Extract actual title if present\n- Textbooks: Use chapter/section name\n- Reports: Summarize main findings\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3"]\n}',
          placeholder: 'Enter the prompt for auto-populating PDF fields...'
        },
        urlAutoPopulate: {
          label: 'URL/Webpage Auto-Populate Prompt',
          content: 'You are helping a user catalog a webpage or article. Analyze the content and generate metadata.\n\nGiven the webpage text, generate:\n1. **Title**: Article/page title (max 100 characters)\n2. **Summary**: Brief description of the content\n3. **Topics**: 3-5 relevant categories\n\nConsider:\n- News articles: Focus on main story\n- Tutorials: Highlight what will be learned\n- Reference pages: Summarize key information\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3"]\n}',
          placeholder: 'Enter the prompt for auto-populating URL fields...'
        },
        imageAutoPopulate: {
          label: 'Image Auto-Populate Prompt',
          content: 'You are helping a user catalog an image for educational use. Based on image analysis results (OCR text, detected objects, scene description), generate metadata.\n\nGiven the image analysis data, generate:\n1. **Title**: Descriptive title for the image (max 100 characters)\n2. **Summary**: What the image shows and its educational value\n3. **Topics**: 3-5 relevant subject areas\n\nConsider:\n- Diagrams: Technical subject matter\n- Charts/Graphs: Data and trends\n- Photos: Subject and context\n\nReturn ONLY valid JSON:\n{\n  "title": "string",\n  "summary": "string",\n  "topics": ["topic1", "topic2", "topic3"]\n}',
          placeholder: 'Enter the prompt for auto-populating image fields...'
        }
      }
    },
    {
      id: 'content-analyzer',
      name: 'Content Analyzer',
      icon: '🔍',
      description: 'Analyzes content sources (PDF, URL, text, video) and identifies which interaction types can be generated with high confidence',
      prompts: {
        pdfAnalysis: {
          label: 'PDF Analysis Prompt',
          content: 'You are analyzing a PDF document to identify possible educational interactions.\n\nGiven the PDF content, identify which interaction types can be generated with high confidence.\n\nFor each possible interaction:\n1. Assess if the content has the necessary elements\n2. Rate confidence (0.0-1.0)\n3. Explain why this interaction fits\n\nReturn JSON: { "possibleInteractions": [{ "type": "fragment-builder", "confidence": 0.95, "reason": "..." }] }',
          placeholder: 'Enter the prompt for analyzing PDF content sources...'
        },
        urlAnalysis: {
          label: 'URL/Webpage Analysis Prompt',
          content: 'You are analyzing webpage content to identify possible educational interactions.\n\nGiven the webpage text, identify which interaction types can be generated.\n\nConsider:\n- Article structure and clarity\n- Presence of examples, comparisons, processes\n- Complexity and reading level\n\nReturn JSON with possible interactions and confidence scores.',
          placeholder: 'Enter the prompt for analyzing web content...'
        },
        textAnalysis: {
          label: 'Text Input Analysis Prompt',
          content: 'You are analyzing raw text input to identify possible educational interactions.\n\nGiven the text, identify which interaction types work best.\n\nPrioritize:\n- Clear concepts and statements (Fragment Builder, True/False)\n- Cause-effect relationships (Prediction Branching)\n- Comparisons (Analogy Bridge)\n- Step-by-step processes (Stepping Stones)\n\nReturn JSON with ranked interaction suggestions.',
          placeholder: 'Enter the prompt for analyzing text input...'
        },
        videoTranscriptAnalysis: {
          label: 'Video Transcript Analysis Prompt',
          content: 'You are analyzing a video transcript to identify possible educational interactions.\n\nGiven the transcript, identify interaction types that leverage:\n- Temporal flow of information\n- Visual descriptions (for Mystery Reveal, Hotspot Explorer)\n- Demonstrations and explanations\n- Q&A patterns\n\nReturn JSON with interaction suggestions and timestamp hints.',
          placeholder: 'Enter the prompt for analyzing video transcripts...'
        }
      }
    },
    {
      id: 'scaffolder',
      name: 'Scaffolder',
      icon: '🏗️',
      description: 'Builds complete lessons from prompts, browsing internet, running content processors, and generating lesson JSON based on TEACH framework',
      prompts: {
        lessonGeneration: {
          label: 'Lesson Generation Prompt',
          content: 'You are an expert educational scaffolder. Given a topic and learning objectives, create a complete lesson following the TEACH framework (Tease, Engage, Absorb, Challenge, Hone)...',
          placeholder: 'Enter the prompt for generating complete lessons...'
        },
        contentSelection: {
          label: 'Content Selection Prompt',
          content: 'Analyze available content sources and select the most relevant ones for the given learning objectives...',
          placeholder: 'Enter the prompt for selecting appropriate content...'
        },
        interactionSelection: {
          label: 'Interaction Type Selection',
          content: 'Given the lesson stage and content, suggest the most appropriate interaction types that will engage students and reinforce learning...',
          placeholder: 'Enter the prompt for choosing interaction types...'
        }
      }
    },
    {
      id: 'lesson-builder',
      name: 'Lesson-Builder Assistant',
      icon: '📚',
      description: 'Assists with updating lesson JSON, processing content, and suggesting improvements to lesson structure',
      prompts: {
        lessonUpdate: {
          label: 'Lesson Update Prompt',
          content: 'You are helping a teacher update their lesson. Analyze the current lesson structure and suggest improvements while maintaining the TEACH framework...',
          placeholder: 'Enter the prompt for lesson updates...'
        },
        contentProcessing: {
          label: 'Content Processing Recommendation',
          content: 'Given new content added to a lesson, recommend the best processing methods and interaction types...',
          placeholder: 'Enter the prompt for content processing recommendations...'
        }
      }
    },
    {
      id: 'teacher',
      name: 'AI Teacher (Tutor)',
      icon: '👨‍🏫',
      description: 'Provides real-time feedback during lessons, recognizes student struggles, and stores feedback for lesson improvements',
      prompts: {
        feedbackGeneration: {
          label: 'Student Feedback Prompt',
          content: 'You are an encouraging AI tutor. The student just answered a question incorrectly. Provide helpful, constructive feedback that guides them toward the correct answer without giving it away...',
          placeholder: 'Enter the prompt for generating student feedback...'
        },
        struggleRecognition: {
          label: 'Struggle Recognition Prompt',
          content: 'Analyze student performance data to identify patterns of struggle. Suggest personalized interventions or alternative explanations...',
          placeholder: 'Enter the prompt for recognizing when students struggle...'
        },
        encouragement: {
          label: 'Encouragement Prompt',
          content: 'Generate encouraging messages when students succeed or make progress. Celebrate their achievements while motivating continued effort...',
          placeholder: 'Enter the prompt for student encouragement...'
        }
      }
    },
    {
      id: 'inventor',
      name: 'Interaction Inventor',
      icon: '🎨',
      description: 'Generates Pixi.js code for new interaction types based on educational requirements and engagement goals',
      prompts: {
        codeGeneration: {
          label: 'Pixi.js Code Generation Prompt',
          content: 'You are an expert in creating educational interactions using Pixi.js. Given an interaction specification, generate clean, well-documented Pixi.js code that is mobile-responsive and accessible...',
          placeholder: 'Enter the prompt for generating interaction code...'
        },
        interactionDesign: {
          label: 'Interaction Design Prompt',
          content: 'Design a new interaction type that addresses these educational goals. Consider engagement, accessibility, and cognitive load...',
          placeholder: 'Enter the prompt for designing new interactions...'
        }
      }
    },
    {
      id: 'optimiser',
      name: 'Lesson Optimiser',
      icon: '⚡',
      description: 'Analyzes lesson feedback data, identifies areas for improvement, and proposes specific changes to enhance learning outcomes',
      prompts: {
        feedbackAnalysis: {
          label: 'Feedback Analysis Prompt',
          content: 'Analyze aggregated student feedback and performance data for this lesson. Identify the top 3 areas where students struggle most...',
          placeholder: 'Enter the prompt for analyzing feedback...'
        },
        improvementSuggestion: {
          label: 'Improvement Suggestion Prompt',
          content: 'Based on the analysis, propose specific, actionable changes to the lesson. For each suggestion, explain the expected impact on learning outcomes...',
          placeholder: 'Enter the prompt for suggesting improvements...'
        }
      }
    },
    {
      id: 'lesson-approver',
      name: 'Lesson Approver',
      icon: '✅',
      description: 'Reviews submitted lessons for quality, pedagogical soundness, and adherence to platform standards before publication',
      prompts: {
        qualityReview: {
          label: 'Quality Review Prompt',
          content: 'You are reviewing a lesson for quality and pedagogical soundness. Check for: clear learning objectives, logical flow, appropriate difficulty, accessibility, and engagement. Provide a detailed assessment...',
          placeholder: 'Enter the prompt for quality review...'
        },
        standardsCheck: {
          label: 'Standards Compliance Prompt',
          content: 'Review the lesson against platform standards: TEACH framework compliance, appropriate use of interactions, content attribution, age-appropriateness, and technical requirements...',
          placeholder: 'Enter the prompt for standards checking...'
        },
        feedbackGeneration: {
          label: 'Rejection Feedback Prompt',
          content: 'The lesson did not meet approval standards. Generate constructive feedback explaining what needs to be improved and how to fix it...',
          placeholder: 'Enter the prompt for rejection feedback...'
        }
      }
    }
  ];

  loading = false;
  saving = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    console.log('[AIPrompts] Component initialized');
    await this.loadPromptsFromBackend();
  }

  /**
   * Load prompts from backend and merge with frontend template
   */
  async loadPromptsFromBackend() {
    this.loading = true;
    try {
      const dbPrompts = await this.http.get<any[]>(`${environment.apiUrl}/ai-prompts`).toPromise();
      
      console.log('[AIPrompts] 📥 Loaded prompts from backend:', dbPrompts?.length || 0);
      
      if (dbPrompts && dbPrompts.length > 0) {
        // Update assistant prompts with database content
        dbPrompts.forEach(dbPrompt => {
          const assistant = this.assistants.find(a => a.id === dbPrompt.assistantId);
          if (assistant && assistant.prompts[dbPrompt.promptKey]) {
            assistant.prompts[dbPrompt.promptKey].content = dbPrompt.content;
            console.log(`[AIPrompts] ✓ Updated ${dbPrompt.assistantId}.${dbPrompt.promptKey}`);
          }
        });
      }
    } catch (error) {
      console.error('[AIPrompts] ❌ Failed to load prompts:', error);
      this.toastService.warning('Using default prompts. Database prompts not available.');
    } finally {
      this.loading = false;
    }
  }

  selectAssistant(assistant: AIAssistant) {
    this.selectedAssistant = assistant;
  }

  getPromptKeys(assistant: AIAssistant): string[] {
    return Object.keys(assistant.prompts);
  }

  cancelEdit() {
    this.selectedAssistant = null;
  }

  async savePrompts() {
    if (!this.selectedAssistant || this.saving) return;

    console.log('[AIPrompts] 💾 Saving prompts for:', this.selectedAssistant.name);
    this.saving = true;

    try {
      const updates = [];
      
      // Save each prompt
      for (const promptKey of Object.keys(this.selectedAssistant.prompts)) {
        const prompt = this.selectedAssistant.prompts[promptKey];
        const promptId = `${this.selectedAssistant.id}.${promptKey}`;
        
        updates.push(
          this.http.put(`${environment.apiUrl}/ai-prompts/${promptId}`, {
            content: prompt.content,
            label: prompt.label
          }).toPromise()
        );
      }
      
      await Promise.all(updates);
      
      console.log('[AIPrompts] ✅ All prompts saved successfully');
      this.toastService.success(
        `✓ Prompts saved for ${this.selectedAssistant.name}! Changes will take effect immediately.`,
        4000
      );
      
      this.selectedAssistant = null;
    } catch (error: any) {
      console.error('[AIPrompts] ❌ Failed to save prompts:', error);
      this.toastService.error(`Failed to save prompts: ${error?.message || 'Unknown error'}`, 5000);
    } finally {
      this.saving = false;
    }
  }

  goBack() {
    if (this.selectedAssistant) {
      this.selectedAssistant = null;
    } else {
      this.router.navigate(['/super-admin']);
    }
  }
}

