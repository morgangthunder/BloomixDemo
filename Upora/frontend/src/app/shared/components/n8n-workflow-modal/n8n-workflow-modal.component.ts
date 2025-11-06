import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentSourceService } from '../../../core/services/content-source.service';
import { ContentSource } from '../../../core/models/content-source.model';

interface N8NWorkflow {
  id: string;
  name: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  status: 'approved' | 'pending' | 'rejected';
  createdBy: string;
  createdAt: string;
  workflowJson: any;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  contentSourceId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

@Component({
  selector: 'app-n8n-workflow-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🔧 Process Content with N8N Workflow</h2>
          <button (click)="close()" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <!-- Step 1: Select Content Source -->
          <div class="step" [class.active]="currentStep === 1">
            <h3>1. Select Content Source</h3>
            <div class="content-selection">
              <div class="search-bar">
                <input
                  type="text"
                  [(ngModel)]="contentSearchQuery"
                  (ngModelChange)="searchContent($event)"
                  placeholder="Search content sources..."
                  class="search-input">
              </div>
              
              <div class="content-list" *ngIf="availableContent.length > 0">
                <div 
                  *ngFor="let content of availableContent" 
                  class="content-item"
                  [class.selected]="selectedContent?.id === content.id"
                  (click)="selectContent(content)">
                  <div class="content-header">
                    <span class="type-badge">{{content.type}}</span>
                    <span class="status-badge" [class]="content.status">{{content.status}}</span>
                  </div>
                  <h4>{{content.title}}</h4>
                  <p class="summary">{{content.summary}}</p>
                </div>
              </div>
              
              <div *ngIf="availableContent.length === 0 && !loadingContent" class="no-content">
                <p>No content sources found. Add some content first.</p>
              </div>
            </div>
          </div>

          <!-- Step 2: Select Workflow -->
          <div class="step" [class.active]="currentStep === 2">
            <h3>2. Choose N8N Workflow</h3>
            <div class="workflow-selection">
              <div class="workflow-list" *ngIf="availableWorkflows.length > 0">
                <div 
                  *ngFor="let workflow of availableWorkflows" 
                  class="workflow-item"
                  [class.selected]="selectedWorkflow?.id === workflow.id"
                  (click)="selectWorkflow(workflow)">
                  <div class="workflow-header">
                    <h4>{{workflow.name}}</h4>
                    <span class="status-badge" [class]="workflow.status">{{workflow.status}}</span>
                  </div>
                  <p class="description">{{workflow.description}}</p>
                  <div class="workflow-meta">
                    <span class="input-format">Input: {{workflow.inputFormat}}</span>
                    <span class="output-format">Output: {{workflow.outputFormat}}</span>
                  </div>
                </div>
              </div>
              
              <div *ngIf="availableWorkflows.length === 0 && !loadingWorkflows" class="no-workflows">
                <p>No approved workflows available. Contact admin to add workflows.</p>
              </div>
            </div>
          </div>

          <!-- Step 3: Configure & Execute -->
          <div class="step" [class.active]="currentStep === 3">
            <h3>3. Configure & Execute</h3>
            <div class="execution-config">
              <div class="config-section">
                <h4>Workflow Configuration</h4>
                <div class="config-item">
                  <label>Output Name:</label>
                  <input 
                    type="text" 
                    [(ngModel)]="executionConfig.outputName"
                    placeholder="e.g., 'JavaScript Summary'"
                    class="form-control">
                </div>
                <div class="config-item">
                  <label>Notes (Optional):</label>
                  <textarea 
                    [(ngModel)]="executionConfig.notes"
                    placeholder="Add any notes about this processing..."
                    class="form-control"
                    rows="3"></textarea>
                </div>
              </div>

              <!-- Execution Status -->
              <div *ngIf="currentExecution" class="execution-status">
                <h4>Execution Status</h4>
                <div class="status-card" [class]="currentExecution.status">
                  <div class="status-header">
                    <span class="status-text">{{currentExecution.status}}</span>
                    <span class="progress">{{currentExecution.progress}}%</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="currentExecution.progress"></div>
                  </div>
                  <div *ngIf="currentExecution.error" class="error-message">
                    {{currentExecution.error}}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="step-indicator">
            <span *ngFor="let step of [1,2,3]" 
                  class="step-dot" 
                  [class.active]="step <= currentStep"
                  [class.current]="step === currentStep">
              {{step}}
            </span>
          </div>
          
          <div class="actions">
            <button 
              (click)="previousStep()" 
              [disabled]="currentStep === 1"
              class="btn-secondary">
              Previous
            </button>
            <button 
              (click)="nextStep()" 
              [disabled]="!canProceed()"
              class="btn-primary">
              {{currentStep === 3 ? 'Execute Workflow' : 'Next'}}
            </button>
            <button (click)="close()" class="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0,0,0,0.8) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 2147483647 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
    }
    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .modal-header h2 {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
    }
    .close-btn:hover {
      color: white;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .step {
      display: none;
    }
    .step.active {
      display: block;
    }
    .step h3 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .search-bar {
      margin-bottom: 16px;
    }
    .search-input {
      width: 100%;
      padding: 12px 16px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    .search-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .content-list, .workflow-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
    }
    .content-item, .workflow-item {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .content-item:hover, .workflow-item:hover {
      border-color: rgba(239,68,68,0.3);
      background: rgba(239,68,68,0.05);
    }
    .content-item.selected, .workflow-item.selected {
      border-color: #ef4444;
      background: rgba(239,68,68,0.1);
    }
    .content-header, .workflow-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .type-badge {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-badge.approved {
      background: rgba(16,185,129,0.2);
      color: #10b981;
    }
    .status-badge.pending {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
    }
    .status-badge.rejected {
      background: rgba(156,163,175,0.2);
      color: #9ca3af;
    }
    .content-item h4, .workflow-item h4 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .summary, .description {
      color: #d1d5db;
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .workflow-meta {
      display: flex;
      gap: 12px;
      font-size: 11px;
      color: #9ca3af;
    }
    .no-content, .no-workflows {
      text-align: center;
      padding: 40px 20px;
      color: #9ca3af;
    }
    .config-section {
      margin-bottom: 24px;
    }
    .config-section h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .config-item {
      margin-bottom: 16px;
    }
    .config-item label {
      display: block;
      color: #d1d5db;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      padding: 10px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #ef4444;
    }
    .execution-status {
      margin-top: 20px;
    }
    .status-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 16px;
    }
    .status-card.running {
      border-color: rgba(59,130,246,0.3);
    }
    .status-card.completed {
      border-color: rgba(16,185,129,0.3);
    }
    .status-card.failed {
      border-color: rgba(239,68,68,0.3);
    }
    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .status-text {
      color: white;
      font-weight: 600;
      text-transform: capitalize;
    }
    .progress {
      color: #9ca3af;
      font-size: 12px;
    }
    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(0,0,0,0.3);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .progress-fill {
      height: 100%;
      background: #ef4444;
      transition: width 0.3s ease;
    }
    .error-message {
      color: #ef4444;
      font-size: 12px;
      margin-top: 8px;
    }
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .step-indicator {
      display: flex;
      gap: 8px;
    }
    .step-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .step-dot.active {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }
    .step-dot.current {
      background: #ef4444;
      color: white;
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    .btn-primary, .btn-secondary, .btn-cancel {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .btn-primary {
      background: #ef4444;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #dc2626;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-secondary:hover:not(:disabled) {
      background: rgba(255,255,255,0.15);
    }
    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-cancel {
      background: none;
      color: #9ca3af;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .btn-cancel:hover {
      color: white;
      border-color: rgba(255,255,255,0.3);
    }
  `]
})
export class N8NWorkflowModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Output() workflowExecuted = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  currentStep = 1;
  selectedContent?: ContentSource;
  selectedWorkflow?: N8NWorkflow;
  currentExecution?: WorkflowExecution;

  // Search and data
  contentSearchQuery = '';
  availableContent: ContentSource[] = [];
  availableWorkflows: N8NWorkflow[] = [];
  loadingContent = false;
  loadingWorkflows = false;

  // Execution configuration
  executionConfig = {
    outputName: '',
    notes: ''
  };

  constructor(private contentSourceService: ContentSourceService) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadContent();
      this.loadWorkflows();
    }
  }

  async loadContent() {
    this.loadingContent = true;
    try {
      await this.contentSourceService.loadContentSources('approved');
      this.contentSourceService.contentSources$.subscribe(sources => {
        this.availableContent = sources;
      });
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      this.loadingContent = false;
    }
  }

  async loadWorkflows() {
    this.loadingWorkflows = true;
    try {
      // TODO: Implement workflow loading from backend
      // For now, mock some workflows
      this.availableWorkflows = [
        {
          id: '1',
          name: 'PDF Text Extraction',
          description: 'Extract and summarize text from PDF documents',
          inputFormat: 'pdf',
          outputFormat: 'json',
          status: 'approved',
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          workflowJson: {}
        },
        {
          id: '2',
          name: 'URL Content Analysis',
          description: 'Analyze web page content and extract key information',
          inputFormat: 'url',
          outputFormat: 'json',
          status: 'approved',
          createdBy: 'admin',
          createdAt: new Date().toISOString(),
          workflowJson: {}
        }
      ];
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      this.loadingWorkflows = false;
    }
  }

  searchContent(query: string) {
    if (!query) {
      this.loadContent();
      return;
    }
    
    // Filter content based on search query
    this.availableContent = this.availableContent.filter(content =>
      content.title?.toLowerCase().includes(query.toLowerCase()) ||
      content.summary?.toLowerCase().includes(query.toLowerCase())
    );
  }

  selectContent(content: ContentSource) {
    this.selectedContent = content;
  }

  selectWorkflow(workflow: N8NWorkflow) {
    this.selectedWorkflow = workflow;
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!this.selectedContent;
      case 2:
        return !!this.selectedWorkflow;
      case 3:
        return !!this.executionConfig.outputName;
      default:
        return false;
    }
  }

  nextStep() {
    if (this.currentStep < 3) {
      this.currentStep++;
    } else {
      this.executeWorkflow();
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  async executeWorkflow() {
    if (!this.selectedContent || !this.selectedWorkflow) return;

    // Create execution object
    this.currentExecution = {
      id: Date.now().toString(),
      workflowId: this.selectedWorkflow.id,
      contentSourceId: this.selectedContent.id,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString()
    };

    // Simulate workflow execution
    const interval = setInterval(() => {
      if (this.currentExecution) {
        this.currentExecution.progress += 10;
        
        if (this.currentExecution.progress >= 100) {
          this.currentExecution.status = 'completed';
          this.currentExecution.completedAt = new Date().toISOString();
          this.currentExecution.result = {
            processedData: 'Mock processed content',
            metadata: {
              processingTime: '2.3s',
              confidence: 0.95
            }
          };
          
          clearInterval(interval);
          
          // Emit the result
          this.workflowExecuted.emit({
            contentSource: this.selectedContent,
            workflow: this.selectedWorkflow,
            execution: this.currentExecution,
            config: this.executionConfig
          });
        }
      }
    }, 200);

    // Simulate potential failure
    if (Math.random() < 0.1) { // 10% chance of failure
      setTimeout(() => {
        if (this.currentExecution) {
          this.currentExecution.status = 'failed';
          this.currentExecution.error = 'Workflow execution failed due to invalid input format';
          clearInterval(interval);
        }
      }, 1000);
    }
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
    this.reset();
  }

  private reset() {
    this.currentStep = 1;
    this.selectedContent = undefined;
    this.selectedWorkflow = undefined;
    this.currentExecution = undefined;
    this.contentSearchQuery = '';
    this.executionConfig = {
      outputName: '',
      notes: ''
    };
  }
}
