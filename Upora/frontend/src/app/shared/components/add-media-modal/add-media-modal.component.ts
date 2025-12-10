import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-add-media-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close.emit()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🎬 Upload Media</h2>
          <button (click)="close.emit()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Media Type *</label>
            <div class="source-toggle">
              <button 
                [class.active]="mediaType === 'video'"
                (click)="mediaType = 'video'"
                class="toggle-btn">
                🎥 Video
              </button>
              <button 
                [class.active]="mediaType === 'audio'"
                (click)="mediaType = 'audio'"
                class="toggle-btn">
                🎵 Audio
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Select {{mediaType === 'video' ? 'Video' : 'Audio'}} File *</label>
            <input 
              type="file" 
              [accept]="mediaType === 'video' ? 'video/*' : 'audio/*'"
              (change)="onFileSelected($event)"
              class="form-control">
            <small class="help-text">
              Supported: {{mediaType === 'video' ? 'MP4, WebM, MOV' : 'MP3, WAV, OGG'}} (Max 500MB)
              <br>
              {{mediaType === 'video' ? 'Max duration: 60 minutes' : 'Max duration: 120 minutes'}}
            </small>
            <div *ngIf="selectedFile" class="file-info">
              <p><strong>Selected:</strong> {{selectedFile.name}}</p>
              <p><strong>Size:</strong> {{formatFileSize(selectedFile.size)}}</p>
            </div>
          </div>

          <div class="form-group">
            <label>Title *</label>
            <input 
              type="text" 
              [(ngModel)]="title"
              placeholder="Enter a title for this media file"
              class="form-control">
          </div>

          <div class="form-group">
            <label>Description (Optional)</label>
            <textarea 
              [(ngModel)]="description"
              placeholder="Brief description of this media file..."
              rows="3"
              class="form-control"></textarea>
          </div>

          <div class="form-group">
            <label>Topics (Optional, comma-separated)</label>
            <input 
              type="text" 
              [(ngModel)]="topics"
              placeholder="e.g., Science, Biology, Cells"
              class="form-control">
          </div>

          <div class="alert alert-info" *ngIf="uploadProgress > 0 && uploadProgress < 100">
            <p>Uploading: {{uploadProgress}}%</p>
            <div class="progress-bar">
              <div class="progress-fill" [style.width.%]="uploadProgress"></div>
            </div>
          </div>

          <div class="alert alert-error" *ngIf="errorMessage">
            {{errorMessage}}
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="close.emit()" class="btn-secondary">Cancel</button>
          <button (click)="onSubmit()" [disabled]="!canSubmit() || submitting" class="btn-primary">
            {{submitting ? 'Uploading...' : 'Upload Media'}}
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
      line-height: 1.5;
    }

    .file-info {
      margin-top: 12px;
      padding: 12px;
      background: rgba(59,130,246,0.1);
      border-radius: 8px;
      border: 1px solid rgba(59,130,246,0.3);
    }

    .file-info p {
      margin: 4px 0;
      color: #93c5fd;
      font-size: 13px;
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

    .alert-error {
      background: rgba(239,68,68,0.2);
      color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.3);
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: rgba(0,0,0,0.3);
      border-radius: 4px;
      margin-top: 8px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #60a5fa;
      transition: width 0.3s;
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
export class AddMediaModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() contentAdded = new EventEmitter<any>();

  mediaType: 'video' | 'audio' = 'video';
  selectedFile: File | null = null;
  title = '';
  description = '';
  topics = '';
  submitting = false;
  uploadProgress = 0;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = 'none';
        }
      } else {
        document.body.style.overflow = '';
        const header = document.querySelector('app-header');
        if (header) {
          (header as HTMLElement).style.display = '';
        }
      }
    }
  }

  canSubmit(): boolean {
    return this.title.trim().length > 0 && this.selectedFile !== null;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.errorMessage = '';

    // Validate file type
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      this.errorMessage = 'Please select a valid video or audio file';
      this.selectedFile = null;
      return;
    }

    // Validate file size (500MB limit)
    const maxFileSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxFileSize) {
      this.errorMessage = `File size (${this.formatFileSize(file.size)}) exceeds maximum limit of ${this.formatFileSize(maxFileSize)}`;
      this.selectedFile = null;
      return;
    }

    // Update media type based on file
    if (isVideo) {
      this.mediaType = 'video';
    } else if (isAudio) {
      this.mediaType = 'audio';
    }

    this.selectedFile = file;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  async onSubmit() {
    if (!this.canSubmit() || this.submitting) return;

    this.submitting = true;
    this.errorMessage = '';
    this.uploadProgress = 0;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', this.selectedFile!);
      formData.append('type', 'media');
      formData.append('title', this.title);
      if (this.description || this.topics) {
        formData.append('metadata', JSON.stringify({
          description: this.description,
          topics: this.topics.split(',').map(t => t.trim()).filter(t => t.length > 0),
        }));
      }

      const headers = new HttpHeaders({
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId,
      });

      // Upload file
      const response: any = await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/content-sources/upload-file`,
          formData,
          { headers }
        )
      );

      // Handle response
      if (response && response.contentSource) {
        // The backend already created the content source, so we just emit the created source
        // The parent component will reload the list
        this.contentAdded.emit({
          ...response.contentSource,
          // Include the response metadata for display
          filePath: response.filePath,
          fileName: response.fileName,
        });
        this.reset();
        this.close.emit();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Error uploading media:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to upload media file. Please try again.';
    } finally {
      this.submitting = false;
      this.uploadProgress = 0;
    }
  }

  private reset() {
    this.mediaType = 'video';
    this.selectedFile = null;
    this.title = '';
    this.description = '';
    this.topics = '';
    this.errorMessage = '';
    this.uploadProgress = 0;
  }
}

