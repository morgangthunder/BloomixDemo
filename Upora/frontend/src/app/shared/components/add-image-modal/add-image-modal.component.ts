import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-image-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🖼️ Add Image</h2>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Image Source</label>
            <div class="source-toggle">
              <button 
                [class.active]="sourceType === 'url'"
                (click)="sourceType = 'url'"
                class="toggle-btn">
                Image URL
              </button>
              <button 
                [class.active]="sourceType === 'upload'"
                (click)="sourceType = 'upload'"
                class="toggle-btn">
                Upload Image
              </button>
            </div>
          </div>

          <div class="form-group" *ngIf="sourceType === 'url'">
            <label>Image URL *</label>
            <input 
              type="url" 
              [(ngModel)]="imageUrl"
              placeholder="https://example.com/image.jpg"
              class="form-control">
          </div>

          <div class="form-group" *ngIf="sourceType === 'upload'">
            <label>Select Image File *</label>
            <input 
              type="file" 
              accept="image/*"
              (change)="onFileSelected($event)"
              class="form-control">
            <small class="help-text">Supported: JPG, PNG, GIF, SVG (Max 10MB)</small>
          </div>

          <div class="form-group">
            <label>Title *</label>
            <input 
              type="text" 
              [(ngModel)]="title"
              placeholder="Enter a title for this image"
              class="form-control">
          </div>

          <div class="form-group">
            <label>Description (Optional)</label>
            <textarea 
              [(ngModel)]="description"
              placeholder="Describe what this image shows..."
              rows="3"
              class="form-control"></textarea>
          </div>

          <div class="form-group">
            <label>Alt Text (Optional)</label>
            <input 
              type="text" 
              [(ngModel)]="altText"
              placeholder="Descriptive text for accessibility"
              class="form-control">
          </div>

          <div class="alert alert-info">
            ℹ️ Image uploads are not yet implemented. Use URL option for now.
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="close.emit()" class="btn-secondary">Cancel</button>
          <button (click)="onSubmit()" [disabled]="!canSubmit() || submitting" class="btn-primary">
            {{submitting ? 'Processing...' : 'Add Image'}}
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

    .source-toggle {
      display: flex;
      gap: 8px;
    }

    .toggle-btn {
      flex: 1;
      padding: 10px;
      border: 2px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.05);
      color: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      border-color: rgba(239,68,68,0.5);
      background: rgba(239,68,68,0.1);
    }

    .toggle-btn.active {
      background: #ef4444;
      color: white;
      border-color: #ef4444;
    }

    .help-text {
      display: block;
      margin-top: 6px;
      color: #9ca3af;
      font-size: 12px;
    }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 16px;
    }

    .alert-info {
      background: rgba(59,130,246,0.2);
      color: #93c5fd;
      border: 1px solid rgba(59,130,246,0.3);
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
export class AddImageModalComponent {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() contentAdded = new EventEmitter<any>();

  sourceType: 'url' | 'upload' = 'url';
  imageUrl = '';
  selectedFile: File | null = null;
  title = '';
  description = '';
  altText = '';
  submitting = false;

  canSubmit(): boolean {
    if (this.sourceType === 'url') {
      return this.title.trim().length > 0 && this.imageUrl.trim().length > 0;
    } else {
      return this.title.trim().length > 0 && this.selectedFile !== null;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      this.selectedFile = file;
    }
  }

  async onSubmit() {
    if (!this.canSubmit() || this.submitting) return;

    this.submitting = true;

    try {
      let sourceUrl = '';
      let filePath = '';

      if (this.sourceType === 'url') {
        sourceUrl = this.imageUrl;
      } else {
        // TODO: Implement file upload to S3
        alert('Image upload is not yet implemented. Please use URL option for now.');
        this.submitting = false;
        return;
      }

      const contentData = {
        type: 'image',
        title: this.title,
        summary: this.description || `Image: ${this.title}`,
        sourceUrl,
        filePath,
        metadata: {
          altText: this.altText,
          mimeType: this.selectedFile?.type,
          fileSize: this.selectedFile?.size,
        },
        status: 'pending', // Will need approval
      };

      this.contentAdded.emit(contentData);
      this.reset();
      this.close.emit();
    } catch (error) {
      console.error('Error submitting image:', error);
      alert('Failed to add image. Please try again.');
    } finally {
      this.submitting = false;
    }
  }

  private reset() {
    this.sourceType = 'url';
    this.imageUrl = '';
    this.selectedFile = null;
    this.title = '';
    this.description = '';
    this.altText = '';
  }
}

