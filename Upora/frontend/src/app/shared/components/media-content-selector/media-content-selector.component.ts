import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ProcessedMediaContent {
  id: string;
  outputName: string;
  outputType: string;
  contentSourceId: string;
  outputData: {
    mediaFileUrl: string;
    mediaFileName: string;
    mediaFileType: 'video' | 'audio';
    mediaFileSize: number;
    mediaFileDuration?: number;
    mediaMetadata?: {
      codec?: string;
      bitrate?: number;
      width?: number;
      height?: number;
      fps?: number;
      sampleRate?: number;
      channels?: number;
    };
    transcription?: any;
  };
  contentSource?: {
    id: string;
    title: string;
    type: string;
    metadata?: any;
  };
  createdAt: string;
}

@Component({
  selector: 'app-media-content-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🎬 Select Media Content</h2>
          <button (click)="closeModal()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Filter -->
          <div class="filter-section">
            <div class="filter-toggle">
              <button 
                [class.active]="mediaTypeFilter === 'all'"
                (click)="mediaTypeFilter = 'all'"
                class="filter-btn">
                All Media
              </button>
              <button 
                [class.active]="mediaTypeFilter === 'video'"
                (click)="mediaTypeFilter = 'video'"
                class="filter-btn">
                🎥 Video
              </button>
              <button 
                [class.active]="mediaTypeFilter === 'audio'"
                (click)="mediaTypeFilter = 'audio'"
                class="filter-btn">
                🎵 Audio
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading media content...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="errorMessage" class="error-state">
            <p>{{errorMessage}}</p>
            <button (click)="loadMediaContent()" class="btn-retry">Retry</button>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && !errorMessage && getFilteredMedia().length === 0" class="empty-state">
            <p>No approved media content available.</p>
            <p class="hint">Upload and approve media files in the Content Library first.</p>
          </div>

          <!-- Media List -->
          <div *ngIf="!loading && !errorMessage && getFilteredMedia().length > 0" class="media-list">
            <div 
              *ngFor="let media of getFilteredMedia()" 
              class="media-item"
              [class.selected]="selectedMediaId === media.id"
              (click)="selectMedia(media)">
              <div class="media-icon">
                {{media.outputData.mediaFileType === 'video' ? '🎥' : '🎵'}}
              </div>
              <div class="media-info">
                <h4>{{media.outputName || media.contentSource?.title || 'Untitled Media'}}</h4>
                <div class="media-meta">
                  <span class="meta-item">{{media.outputData.mediaFileType === 'video' ? 'Video' : 'Audio'}}</span>
                  <span class="meta-item" *ngIf="media.outputData.mediaFileSize">
                    {{formatFileSize(media.outputData.mediaFileSize)}}
                  </span>
                  <span class="meta-item" *ngIf="media.outputData.mediaFileDuration">
                    {{formatDuration(media.outputData.mediaFileDuration)}}
                  </span>
                  <span class="meta-item" *ngIf="media.outputData.mediaMetadata?.codec">
                    {{media.outputData.mediaMetadata?.codec}}
                  </span>
                </div>
                <p class="media-source" *ngIf="media.contentSource">
                  Source: {{media.contentSource.title}}
                </p>
              </div>
              <div class="media-actions">
                <button 
                  class="btn-select"
                  [class.selected]="selectedMediaId === media.id"
                  (click)="selectMedia(media); $event.stopPropagation()">
                  {{selectedMediaId === media.id ? '✓ Selected' : 'Select'}}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeModal()" class="btn-secondary">Cancel</button>
          <button 
            (click)="confirmSelection()" 
            [disabled]="!selectedMediaId"
            class="btn-primary">
            Confirm Selection
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
      max-width: 800px;
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

    .filter-section {
      margin-bottom: 24px;
    }

    .filter-toggle {
      display: flex;
      gap: 8px;
    }

    .filter-btn {
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

    .filter-btn:hover {
      border-color: rgba(239,68,68,0.5);
      background: rgba(239,68,68,0.1);
    }

    .filter-btn.active {
      background: #ef4444;
      color: white;
      border-color: #ef4444;
    }

    .loading-state, .error-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #9ca3af;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(239,68,68,0.2);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      color: #fca5a5;
    }

    .btn-retry {
      margin-top: 16px;
      padding: 8px 16px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }

    .hint {
      font-size: 13px;
      color: #6b7280;
      margin-top: 8px;
    }

    .media-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .media-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.05);
      border: 2px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .media-item:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(239,68,68,0.3);
    }

    .media-item.selected {
      background: rgba(239,68,68,0.1);
      border-color: #ef4444;
    }

    .media-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .media-info {
      flex: 1;
      min-width: 0;
    }

    .media-info h4 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .media-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }

    .meta-item {
      padding: 4px 8px;
      background: rgba(59,130,246,0.2);
      color: #93c5fd;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .media-source {
      color: #9ca3af;
      font-size: 13px;
      margin: 0;
    }

    .media-actions {
      flex-shrink: 0;
    }

    .btn-select {
      padding: 8px 16px;
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      border: 1px solid rgba(59,130,246,0.3);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-select:hover {
      background: rgba(59,130,246,0.3);
    }

    .btn-select.selected {
      background: #22c55e;
      color: white;
      border-color: #22c55e;
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
export class MediaContentSelectorComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() selected = new EventEmitter<string>(); // Emits processed content ID

  mediaContent: ProcessedMediaContent[] = [];
  loading = false;
  errorMessage = '';
  mediaTypeFilter: 'all' | 'video' | 'audio' = 'all';
  selectedMediaId: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadMediaContent();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.loadMediaContent();
      // Lock body scroll and hide header when modal opens
      document.body.style.overflow = 'hidden';
      const header = document.querySelector('app-header');
      if (header) {
        (header as HTMLElement).style.display = 'none';
      }
    } else if (changes['isOpen'] && !this.isOpen) {
      // Unlock body scroll and show header when modal closes
      document.body.style.overflow = '';
      const header = document.querySelector('app-header');
      if (header) {
        (header as HTMLElement).style.display = '';
      }
    }
  }

  async loadMediaContent() {
    this.loading = true;
    this.errorMessage = '';
    this.selectedMediaId = null;

    try {
      const response: any = await firstValueFrom(
        this.http.get<any>(
          `${environment.apiUrl}/lesson-editor/processed-outputs/all`,
          {
            headers: {
              'x-tenant-id': environment.tenantId,
              'x-user-id': environment.defaultUserId
            }
          }
        )
      );

      // Filter for uploaded-media type
      this.mediaContent = (response || []).filter((item: any) => {
        return item.outputType === 'uploaded-media' && 
               item.outputData && 
               item.outputData.mediaFileUrl;
      }).map((item: any) => ({
        id: item.id,
        outputName: item.outputName || item.title || 'Untitled Media',
        outputType: item.outputType,
        contentSourceId: item.contentSourceId,
        outputData: item.outputData,
        contentSource: item.contentSource,
        createdAt: item.createdAt || new Date().toISOString(),
      }));

      console.log('[MediaContentSelector] Loaded media content:', this.mediaContent.length);
    } catch (error: any) {
      console.error('[MediaContentSelector] Failed to load media content:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to load media content';
    } finally {
      this.loading = false;
    }
  }

  getFilteredMedia(): ProcessedMediaContent[] {
    if (this.mediaTypeFilter === 'all') {
      return this.mediaContent;
    }
    return this.mediaContent.filter(media => 
      media.outputData.mediaFileType === this.mediaTypeFilter
    );
  }

  selectMedia(media: ProcessedMediaContent) {
    this.selectedMediaId = media.id;
  }

  confirmSelection() {
    if (this.selectedMediaId) {
      this.selected.emit(this.selectedMediaId);
      this.closeModal();
    }
  }

  closeModal() {
    this.selectedMediaId = null;
    this.close.emit();
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

