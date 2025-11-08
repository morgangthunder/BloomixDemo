import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-text-content-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>📝 Add Text Content</h2>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Title *</label>
            <input 
              type="text" 
              [(ngModel)]="title"
              placeholder="Enter a title for this content"
              class="form-control">
          </div>

          <div class="form-group">
            <label>Text Content *</label>
            <textarea 
              [(ngModel)]="textContent"
              placeholder="Paste or type your text content here..."
              rows="10"
              class="form-control"></textarea>
          </div>

          <div class="form-group">
            <label>Summary (Optional)</label>
            <textarea 
              [(ngModel)]="summary"
              placeholder="Brief summary of this content..."
              rows="3"
              class="form-control"></textarea>
          </div>

          <div class="form-group">
            <label>Topics (Optional, comma-separated)</label>
            <input 
              type="text" 
              [(ngModel)]="topics"
              placeholder="e.g., JavaScript, Variables, Programming"
              class="form-control">
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="close.emit()" class="btn-secondary">Cancel</button>
          <button (click)="onSubmit()" [disabled]="!canSubmit() || submitting" class="btn-primary">
            {{submitting ? 'Processing...' : 'Add Content'}}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 20px;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .modal-overlay {
        padding: 8px;
      }
    }

    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    @media (max-width: 768px) {
      .modal-content {
        border-radius: 12px;
        max-width: 100%;
        max-height: calc(100vh - 16px);
        height: calc(100vh - 16px);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }

    .modal-header h2 {
      color: white;
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }

    .close-btn:hover {
      color: white;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: white;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: #ef4444;
      background: rgba(255,255,255,0.08);
    }

    .form-control::placeholder {
      color: #6b7280;
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }

    .modal-footer {
      padding: 16px 20px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
      background: #1f2937;
      min-height: 64px;
    }

    @media (max-width: 768px) {
      .modal-footer {
        padding: 12px 16px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }

    .btn-secondary, .btn-primary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
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
  `]
})
export class AddTextContentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() contentAdded = new EventEmitter<any>();

  title = '';
  textContent = '';
  summary = '';
  topics = '';
  submitting = false;

  ngOnChanges(changes: SimpleChanges) {
    // Lock/unlock body scroll and hide header when modal opens/closes
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
        // Hide header when modal is open
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = 'none';
        }
      } else {
        document.body.style.overflow = '';
        // Show header when modal closes
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = '';
        }
      }
    }
  }

  canSubmit(): boolean {
    return this.title.trim().length > 0 && this.textContent.trim().length > 0;
  }

  async onSubmit() {
    if (!this.canSubmit() || this.submitting) return;

    this.submitting = true;

    try {
      const topicsArray = this.topics
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const contentData = {
        type: 'text',
        title: this.title,
        summary: this.summary || `Text content: ${this.title}`,
        fullText: this.textContent,
        sourceUrl: null,
        metadata: {
          topics: topicsArray,
          keywords: this.extractKeywords(this.textContent),
          wordCount: this.textContent.split(/\s+/).length,
        },
        status: 'pending', // Will need approval
      };

      this.contentAdded.emit(contentData);
      this.reset();
      this.close.emit();
    } catch (error) {
      console.error('Error submitting text content:', error);
      alert('Failed to add text content. Please try again.');
    } finally {
      this.submitting = false;
    }
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction: get words longer than 4 characters
    const words = text.toLowerCase().match(/\b\w{5,}\b/g) || [];
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 10); // Top 10
  }

  private reset() {
    this.title = '';
    this.textContent = '';
    this.summary = '';
    this.topics = '';
  }
}

