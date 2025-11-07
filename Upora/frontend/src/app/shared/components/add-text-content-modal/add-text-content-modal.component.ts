import { Component, Input, Output, EventEmitter } from '@angular/core';
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
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 32px;
      cursor: pointer;
      color: #999;
      line-height: 1;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: #0066cc;
      box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
    }

    textarea.form-control {
      resize: vertical;
      min-height: 100px;
    }

    .modal-footer {
      padding: 24px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .btn-secondary, .btn-primary {
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      font-size: 14px;
    }

    .btn-secondary {
      background: #f0f0f0;
      color: #333;
    }

    .btn-secondary:hover {
      background: #e0e0e0;
    }

    .btn-primary {
      background: #0066cc;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0052a3;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class AddTextContentModalComponent {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() contentAdded = new EventEmitter<any>();

  title = '';
  textContent = '';
  summary = '';
  topics = '';
  submitting = false;

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

