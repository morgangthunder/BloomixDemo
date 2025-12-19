import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ProcessedUrlContent {
  id: string;
  outputName: string;
  outputType: string;
  contentSourceId: string;
  outputData: {
    url?: string;
    sourceUrl?: string;
    title?: string;
    description?: string;
    [key: string]: any;
  };
  contentSource?: {
    id: string;
    title: string;
    type: string;
    sourceUrl?: string;
    metadata?: any;
  };
  createdAt: string;
}

@Component({
  selector: 'app-url-content-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>🔗 Select URL Content</h2>
          <button (click)="closeModal()" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Loading State -->
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading URL content...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="errorMessage" class="error-state">
            <p>{{errorMessage}}</p>
            <button (click)="loadUrlContent()" class="btn-retry">Retry</button>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && !errorMessage && urlContentList.length === 0" class="empty-state">
            <p>No approved URL content available.</p>
            <p class="hint">Upload and approve URL content sources in the Content Library first.</p>
          </div>

          <!-- URL Content List -->
          <div *ngIf="!loading && !errorMessage && urlContentList.length > 0" class="content-list">
            <div 
              *ngFor="let content of urlContentList" 
              class="content-item"
              [class.selected]="selectedContentId === content.id"
              (click)="selectContent(content)">
              <div class="content-icon">
                🔗
              </div>
              <div class="content-info">
                <h4>{{content.outputName || content.contentSource?.title || 'Untitled URL'}}</h4>
                <div class="content-meta">
                  <span class="meta-item">URL</span>
                  <span class="meta-url" *ngIf="getContentUrl(content)">
                    {{getContentUrl(content)}}
                  </span>
                </div>
                <p class="content-source" *ngIf="content.contentSource">
                  Source: {{content.contentSource.title}}
                </p>
              </div>
              <div class="content-actions">
                <button 
                  class="btn-select"
                  [class.selected]="selectedContentId === content.id"
                  (click)="selectContent(content); $event.stopPropagation()">
                  {{selectedContentId === content.id ? '✓ Selected' : 'Select'}}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="closeModal()" class="btn-secondary">Cancel</button>
          <button 
            (click)="confirmSelection()" 
            [disabled]="!selectedContentId"
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

    .loading-state, .error-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #9ca3af;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid rgba(0, 212, 255, 0.2);
      border-top-color: #00d4ff;
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
      background: #00d4ff;
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

    .content-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .content-item {
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

    .content-item:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .content-item.selected {
      background: rgba(0, 212, 255, 0.1);
      border-color: #00d4ff;
    }

    .content-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .content-info {
      flex: 1;
      min-width: 0;
    }

    .content-info h4 {
      color: white;
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .content-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
      align-items: center;
    }

    .meta-item {
      padding: 4px 8px;
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .meta-url {
      color: #9ca3af;
      font-size: 12px;
      word-break: break-all;
      max-width: 400px;
    }

    .content-source {
      color: #9ca3af;
      font-size: 13px;
      margin: 0;
    }

    .content-actions {
      flex-shrink: 0;
    }

    .btn-select {
      padding: 8px 16px;
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-select:hover {
      background: rgba(0, 212, 255, 0.3);
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

    .btn-secondary {
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }

    .btn-primary {
      padding: 10px 20px;
      background: #00d4ff;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #00b8e6;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class UrlContentSelectorComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() selectedContentId: string | null = null;
  @Input() filterVideoUrls = false; // If true, only show YouTube/Vimeo URLs
  @Output() close = new EventEmitter<void>();
  @Output() contentSelected = new EventEmitter<string>();

  urlContentList: ProcessedUrlContent[] = [];
  loading = false;
  errorMessage = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadUrlContent();
    }
  }

  ngOnChanges(changes: any) {
    if (changes.isOpen && changes.isOpen.currentValue && !changes.isOpen.previousValue) {
      this.loadUrlContent();
    }
  }

  async loadUrlContent() {
    this.loading = true;
    this.errorMessage = '';
    
    try {
      const response = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/lesson-editor/processed-outputs/all`, {
          headers: {
            'x-tenant-id': environment.tenantId,
            'x-user-id': environment.defaultUserId
          }
        })
      );

      // Filter for URL content sources (type === 'url')
      // If filterVideoUrls is true, only show YouTube/Vimeo URLs
      this.urlContentList = response.filter(item => {
        const sourceType = item.contentSource?.type || item.outputData?.contentSourceType;
        if (sourceType !== 'url' && sourceType !== 'api') {
          return false;
        }
        
        // If filtering for video URLs, check if it's YouTube or Vimeo
        if (this.filterVideoUrls) {
          const url = item.outputData?.url || item.outputData?.sourceUrl || item.contentSource?.sourceUrl || '';
          const urlLower = url.toLowerCase();
          return urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('vimeo.com');
        }
        
        return true;
      });

      this.loading = false;
    } catch (error: any) {
      console.error('[UrlContentSelector] Failed to load URL content:', error);
      this.errorMessage = error.message || 'Failed to load URL content';
      this.loading = false;
    }
  }

  selectContent(content: ProcessedUrlContent) {
    this.selectedContentId = content.id;
  }

  confirmSelection() {
    if (this.selectedContentId) {
      this.contentSelected.emit(this.selectedContentId);
      this.closeModal();
    }
  }

  closeModal() {
    this.close.emit();
  }

  getContentUrl(content: ProcessedUrlContent): string | null {
    return content.outputData?.url || 
           content.outputData?.sourceUrl || 
           content.contentSource?.sourceUrl || 
           null;
  }
}

