import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

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
            <button class="btn-secondary" (click)="cancelEdit()">Cancel</button>
            <button class="btn-primary" (click)="savePrompts()">Save Changes</button>
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

  constructor(private router: Router) {}

  ngOnInit() {
    // In the future, load prompts from backend
    console.log('[AIPrompts] Component initialized');
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

  savePrompts() {
    if (!this.selectedAssistant) return;

    console.log('[AIPrompts] Saving prompts for:', this.selectedAssistant.name, this.selectedAssistant.prompts);
    
    // TODO: Send to backend API
    // this.http.put(`/api/super-admin/ai-prompts/${this.selectedAssistant.id}`, this.selectedAssistant.prompts)
    
    alert(`Prompts saved for ${this.selectedAssistant.name}!\n\n(Backend integration coming soon)`);
    this.selectedAssistant = null;
  }

  goBack() {
    if (this.selectedAssistant) {
      this.selectedAssistant = null;
    } else {
      this.router.navigate(['/super-admin']);
    }
  }
}

