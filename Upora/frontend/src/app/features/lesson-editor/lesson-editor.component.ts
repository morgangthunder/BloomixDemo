import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ContentProcessorModalComponent } from '../../shared/components/content-processor-modal/content-processor-modal.component';
import { ApprovalQueueModalComponent } from '../../shared/components/approval-queue-modal/approval-queue-modal.component';

@Component({
  selector: 'app-lesson-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ContentProcessorModalComponent, ApprovalQueueModalComponent],
  template: `
    <div class="lesson-editor" style="background-color: #000; min-height: 100vh; color: white; padding-top: 80px;">
      <!-- Header -->
      <div class="editor-header" style="background-color: #0a0a0a; padding: 20px; border-bottom: 1px solid #333;">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button (click)="goBack()" class="text-white hover:text-brand-red transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </button>
            <h1 class="text-2xl font-bold">Edit Lesson</h1>
          </div>
          <div class="flex items-center space-x-4">
            <button (click)="saveDraft()" class="btn-secondary">Save Draft</button>
            <button (click)="submitForApproval()" class="btn-primary">Submit for Approval</button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="editor-content" style="display: flex; min-height: calc(100vh - 160px);">
        <!-- Sidebar -->
        <div class="editor-sidebar" style="width: 300px; background-color: #111; border-right: 1px solid #333; padding: 20px;">
          <h2 class="text-lg font-semibold mb-4">Lesson Structure</h2>
          
          <!-- Stages -->
          <div class="stages-section mb-6">
            <h3 class="text-sm font-medium text-gray-400 mb-2">Stages</h3>
            <div class="stage-list">
              <div *ngFor="let stage of stages; let i = index" 
                   class="stage-item" 
                   [class.active]="selectedStage === i"
                   (click)="selectStage(i)">
                {{stage.name}}
              </div>
            </div>
          </div>

          <!-- Sub-stages -->
          <div class="substages-section" *ngIf="selectedStage !== null">
            <h3 class="text-sm font-medium text-gray-400 mb-2">Sub-stages</h3>
            <div class="substage-list">
              <div *ngFor="let substage of getCurrentSubStages(); let i = index" 
                   class="substage-item"
                   [class.active]="selectedSubStage === i"
                   (click)="selectSubStage(i)">
                {{substage.name}}
              </div>
            </div>
          </div>
        </div>

        <!-- Main Panel -->
        <div class="editor-main" style="flex: 1; padding: 20px;">
          <!-- Tool Tabs -->
          <div class="tool-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button *ngFor="let tab of toolTabs" 
                    class="tool-tab"
                    [class.active]="activeTab === tab.id"
                    (click)="setActiveTab(tab.id)">
              {{tab.icon}} {{tab.name}}
            </button>
          </div>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Content Processing Tab -->
            <div *ngIf="activeTab === 'content-processing'" class="tab-panel">
              <h3 class="text-xl font-semibold mb-4">Content Processing</h3>
              <p class="text-gray-400 mb-6">Process and manage content for your lesson.</p>
              
              <div class="content-actions">
                <button (click)="openContentProcessor()" class="btn-primary">
                  🔗 Paste URL
                </button>
                <button (click)="openApprovalQueue()" class="btn-secondary">
                  📋 Approval Queue
                </button>
              </div>
            </div>

            <!-- Lesson Structure Tab -->
            <div *ngIf="activeTab === 'lesson-structure'" class="tab-panel">
              <h3 class="text-xl font-semibold mb-4">Lesson Structure</h3>
              <p class="text-gray-400 mb-6">Configure the structure and flow of your lesson.</p>
              
              <div class="structure-editor">
                <div class="stage-editor" *ngIf="selectedStage !== null">
                  <h4 class="text-lg font-medium mb-3">{{stages[selectedStage].name}}</h4>
                  <div class="form-group">
                    <label>Stage Name:</label>
                    <input type="text" [(ngModel)]="stages[selectedStage].name" class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Description:</label>
                    <textarea [(ngModel)]="stages[selectedStage].description" class="form-textarea"></textarea>
                  </div>
                </div>
              </div>
            </div>

            <!-- Sub-stage Config Tab -->
            <div *ngIf="activeTab === 'substage-config'" class="tab-panel">
              <h3 class="text-xl font-semibold mb-4">Sub-stage Configuration</h3>
              <p class="text-gray-400 mb-6">Configure interaction types and content for this sub-stage.</p>
              
              <div class="substage-editor" *ngIf="selectedSubStage !== null">
                <div class="form-group">
                  <label>Interaction Type:</label>
                  <select [(ngModel)]="getCurrentSubStages()[selectedSubStage].interactionType" class="form-select">
                    <option value="video">Video Player</option>
                    <option value="quiz">Quiz</option>
                    <option value="text">Text Content</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Content:</label>
                  <textarea [(ngModel)]="getCurrentSubStages()[selectedSubStage].content" class="form-textarea"></textarea>
                </div>
              </div>
            </div>

            <!-- Preview Tab -->
            <div *ngIf="activeTab === 'preview'" class="tab-panel">
              <h3 class="text-xl font-semibold mb-4">Preview</h3>
              <p class="text-gray-400 mb-6">Preview how your lesson will appear to students.</p>
              
              <div class="preview-content">
                <div class="preview-stage" *ngIf="selectedStage !== null">
                  <h4>{{stages[selectedStage].name}}</h4>
                  <p>{{stages[selectedStage].description}}</p>
                  
                  <div class="preview-substages">
                    <div *ngFor="let substage of getCurrentSubStages()" class="preview-substage">
                      <h5>{{substage.name}}</h5>
                      <p>{{substage.content}}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Assistant Tab -->
            <div *ngIf="activeTab === 'ai-assistant'" class="tab-panel">
              <h3 class="text-xl font-semibold mb-4">AI Assistant</h3>
              <p class="text-gray-400 mb-6">Get help with your lesson content and structure.</p>
              
              <div class="ai-chat">
                <div class="chat-messages">
                  <div class="message ai-message">
                    <p>Hello! I'm here to help you create an engaging lesson. What would you like to work on?</p>
                  </div>
                </div>
                
                <div class="chat-input">
                  <input type="text" placeholder="Ask me anything about your lesson..." class="form-input">
                  <button class="btn-primary">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modals -->
      <app-content-processor-modal
        [isOpen]="showContentProcessor"
        [lessonId]="lessonId"
        (closed)="closeContentProcessor()"
        (contentProcessed)="onContentProcessed($event)"
        (contentSubmittedForApproval)="onContentSubmittedForApproval($event)">
      </app-content-processor-modal>

      <app-approval-queue-modal
        [isOpen]="showApprovalQueue"
        (closed)="closeApprovalQueue()"
        (itemApproved)="onItemApproved($event)"
        (itemRejected)="onItemRejected($event)">
      </app-approval-queue-modal>
    </div>
  `,
  styles: [`
    .lesson-editor {
      font-family: 'Inter', sans-serif;
    }
    
    .btn-primary {
      background: #ef4444;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary:hover {
      background: #dc2626;
    }
    
    .btn-secondary {
      background: #374151;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-secondary:hover {
      background: #4b5563;
    }
    
    .stage-item, .substage-item {
      padding: 12px;
      margin-bottom: 8px;
      background: #1f2937;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .stage-item:hover, .substage-item:hover {
      background: #374151;
    }
    
    .stage-item.active, .substage-item.active {
      background: #ef4444;
    }
    
    .tool-tab {
      background: #1f2937;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .tool-tab:hover {
      background: #374151;
    }
    
    .tool-tab.active {
      background: #ef4444;
    }
    
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 12px;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    
    .form-textarea {
      min-height: 100px;
      resize: vertical;
    }
    
    .content-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    
    .ai-chat {
      background: #1f2937;
      border-radius: 12px;
      padding: 20px;
    }
    
    .chat-messages {
      min-height: 200px;
      margin-bottom: 20px;
    }
    
    .message {
      padding: 12px;
      margin-bottom: 12px;
      border-radius: 8px;
    }
    
    .ai-message {
      background: #374151;
    }
    
    .chat-input {
      display: flex;
      gap: 12px;
    }
    
    .chat-input input {
      flex: 1;
    }
  `]
})
export class LessonEditorComponent implements OnInit {
  lessonId: string = '';
  selectedStage: number | null = null;
  selectedSubStage: number | null = null;
  activeTab: string = 'content-processing';
  
  showContentProcessor = false;
  showApprovalQueue = false;
  
  toolTabs = [
    { id: 'content-processing', name: 'Content Processing', icon: '🔗' },
    { id: 'lesson-structure', name: 'Lesson Structure', icon: '📚' },
    { id: 'substage-config', name: 'Sub-stage Config', icon: '⚙️' },
    { id: 'preview', name: 'Preview', icon: '👁️' },
    { id: 'ai-assistant', name: 'AI Assistant', icon: '🤖' }
  ];
  
  stages = [
    { name: 'Introduction', description: 'Welcome and overview', substages: [
      { name: 'Welcome', content: 'Welcome to this lesson', interactionType: 'text' },
      { name: 'Objectives', content: 'What you will learn', interactionType: 'text' }
    ]},
    { name: 'Main Content', description: 'Core learning material', substages: [
      { name: 'Video Lesson', content: 'Watch this video', interactionType: 'video' },
      { name: 'Interactive Quiz', content: 'Test your knowledge', interactionType: 'quiz' }
    ]},
    { name: 'Conclusion', description: 'Summary and next steps', substages: [
      { name: 'Summary', content: 'Key takeaways', interactionType: 'text' },
      { name: 'Next Steps', content: 'What to do next', interactionType: 'text' }
    ]}
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.lessonId = params['id'] || 'new-lesson';
    });
  }

  goBack() {
    this.router.navigate(['/lesson-builder']);
  }

  selectStage(index: number) {
    this.selectedStage = index;
    this.selectedSubStage = null;
  }

  selectSubStage(index: number) {
    this.selectedSubStage = index;
  }

  getCurrentSubStages() {
    if (this.selectedStage === null) return [];
    return this.stages[this.selectedStage].substages;
  }

  setActiveTab(tabId: string) {
    this.activeTab = tabId;
  }

  openContentProcessor() {
    this.showContentProcessor = true;
  }

  closeContentProcessor() {
    this.showContentProcessor = false;
  }

  openApprovalQueue() {
    this.showApprovalQueue = true;
  }

  closeApprovalQueue() {
    this.showApprovalQueue = false;
  }

  onContentProcessed(content: any) {
    console.log('Content processed:', content);
    // Handle processed content
  }

  onContentSubmittedForApproval(submission: any) {
    console.log('Content submitted for approval:', submission);
    // Handle approval submission
  }

  onItemApproved(item: any) {
    console.log('Item approved:', item);
    // Handle item approval
  }

  onItemRejected(item: any) {
    console.log('Item rejected:', item);
    // Handle item rejection
  }

  saveDraft() {
    console.log('Saving draft...');
    // Implement save functionality
  }

  submitForApproval() {
    console.log('Submitting for approval...');
    // Implement submission functionality
  }
}