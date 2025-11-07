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

    .source-toggle {
      display: flex;
      gap: 8px;
    }

    .toggle-btn {
      flex: 1;
      padding: 10px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      border-color: #0066cc;
    }

    .toggle-btn.active {
      background: #0066cc;
      color: white;
      border-color: #0066cc;
    }

    .help-text {
      display: block;
      margin-top: 6px;
      color: #666;
      font-size: 12px;
    }

    .alert {
      padding: 12px;
      border-radius: 6px;
      margin-top: 16px;
    }

    .alert-info {
      background: #e3f2fd;
      color: #1976d2;
      border: 1px solid #90caf9;
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

