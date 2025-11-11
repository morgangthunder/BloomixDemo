import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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
            <div class="label-with-button">
              <label>Text Content *</label>
              <button 
                *ngIf="textContent.length > 100 && !title && !summary"
                (click)="autoFillFields()"
                [disabled]="autoFilling"
                class="btn-auto-fill"
                type="button">
                {{ autoFilling ? '✨ Auto-filling...' : '✨ Auto-Fill Title & Summary' }}
              </button>
            </div>
            <textarea 
              [(ngModel)]="textContent"
              (input)="onTextChange()"
              placeholder="Paste or type your text content here..."
              rows="10"
              class="form-control"
              [class.error-border]="isTextTooLong()"></textarea>
            <div class="char-counter" [class.error]="isTextTooLong()">
              {{ getCharCount() }} / {{ maxChars }} characters
              <span *ngIf="isTextTooLong()" class="error-badge">
                ({{ getCharCount() - maxChars }} over limit)
              </span>
            </div>
            <div class="token-estimate" [class.warning]="getEstimatedTokens() > maxTokens * 0.8">
              Estimated tokens: ~{{ getEstimatedTokens() | number }} / {{ maxTokens | number }}
            </div>
            <small class="help-text" *ngIf="!isTextTooLong()">
              Maximum ~{{ maxWords | number }} words ({{ maxTokens | number }} tokens for Grok 3 Mini)
            </small>
            <small class="error-help-text" *ngIf="isTextTooLong()">
              ⚠️ Content exceeds Grok 3 Mini's limit! Please reduce to ~{{ maxWords | number }} words or split into multiple content sources.
            </small>
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

    .error-border {
      border-color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.05) !important;
    }

    .char-counter {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 12px;
      color: #9ca3af;
    }

    .char-counter.error {
      color: #ef4444;
      font-weight: 600;
    }

    .error-badge {
      color: #ef4444;
      font-weight: bold;
      margin-left: 8px;
    }

    .token-estimate {
      margin-top: 4px;
      font-size: 11px;
      color: #6b7280;
      font-family: monospace;
    }

    .token-estimate.warning {
      color: #f59e0b;
      font-weight: 600;
    }

    .error-help-text {
      display: block;
      margin-top: 6px;
      color: #ef4444;
      font-size: 12px;
      font-weight: 500;
    }

    .label-with-button {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .label-with-button label {
      margin-bottom: 0;
    }

    .btn-auto-fill {
      padding: 6px 12px;
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-auto-fill:hover:not(:disabled) {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(139, 92, 246, 0.3);
    }

    .btn-auto-fill:disabled {
      opacity: 0.6;
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
  autoFilling = false;

  // Grok 3 Mini limits (conservative estimates with headroom for prompt & response)
  readonly maxTokens = 100000; // Safe limit (128k context - 28k for prompt/response/overhead)
  readonly maxWords = 75000; // ~1.3 tokens per word
  readonly maxChars = 400000; // ~4 chars per token

  constructor(private http: HttpClient) {}

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
    return this.title.trim().length > 0 && 
           this.textContent.trim().length > 0 && 
           !this.isTextTooLong();
  }

  getCharCount(): number {
    return this.textContent.length;
  }

  getEstimatedTokens(): number {
    // Rough estimate: 1 token ≈ 4 characters for English text
    return Math.ceil(this.textContent.length / 4);
  }

  isTextTooLong(): boolean {
    return this.getCharCount() > this.maxChars || this.getEstimatedTokens() > this.maxTokens;
  }

  onTextChange(): void {
    // Real-time validation feedback
    if (this.isTextTooLong()) {
      console.warn('[AddTextContentModal] ⚠️ Content exceeds limit:', {
        chars: this.getCharCount(),
        maxChars: this.maxChars,
        estimatedTokens: this.getEstimatedTokens(),
        maxTokens: this.maxTokens
      });
    }
  }

  async autoFillFields(): Promise<void> {
    if (!this.textContent || this.textContent.length < 100 || this.autoFilling) {
      return;
    }

    this.autoFilling = true;
    console.log('[AddTextContentModal] ✨ Auto-filling fields from text content...');

    try {
      const response = await this.http.post<{
        title: string;
        summary: string;
        topics: string[];
      }>(`${environment.apiUrl}/content-sources/auto-populate/text`, {
        textContent: this.textContent
      }).toPromise();

      if (response) {
        this.title = response.title;
        this.summary = response.summary;
        this.topics = response.topics.join(', ');

        console.log('[AddTextContentModal] ✅ Auto-filled:', {
          title: this.title,
          summary: this.summary,
          topics: this.topics
        });
      }
    } catch (error: any) {
      console.error('[AddTextContentModal] ❌ Auto-fill failed:', error);
      alert(`Auto-fill failed: ${error?.message || 'Unknown error'}. You can still fill fields manually.`);
    } finally {
      this.autoFilling = false;
    }
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
        type: 'text' as const,
        title: this.title,
        summary: this.summary || `Text content: ${this.title}`,
        fullText: this.textContent,
        sourceUrl: '',
        filePath: '',
        metadata: {
          topics: topicsArray,
          keywords: this.extractKeywords(this.textContent),
          wordCount: this.textContent.split(/\s+/).length,
        },
        // NOTE: status, tenantId, and createdBy are set server-side via headers
      };

      console.log('[AddTextContentModal] 📤 Emitting content data:', JSON.stringify(contentData, null, 2));
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

