import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ContentSourceService } from '../../../core/services/content-source.service';
import { environment } from '../../../../environments/environment';

interface ContentSource {
  id: string;
  type: string;
  title?: string;
  summary?: string;
  fullText?: string;
  sourceUrl?: string;
  filePath?: string;
  status: string;
  metadata?: any;
  createdAt?: string;
  createdBy?: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface ProcessedOutput {
  id: string;
  outputName: string;
  outputType: string;
  contentSourceId: string;
}

@Component({
  selector: 'app-content-source-view-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content viewer-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{contentSource?.title || 'Content Source'}}</h2>
          <button (click)="close()" class="close-btn">✕</button>
        </div>
        
        <div class="modal-body-scrollable" *ngIf="contentSource">
          <!-- Status Badge -->
          <div class="status-section">
            <span class="status-badge" [class.approved]="contentSource.status === 'approved'" 
                  [class.pending]="contentSource.status === 'pending'" 
                  [class.rejected]="contentSource.status === 'rejected'">
              {{contentSource.status}}
            </span>
            <span class="content-type-badge">{{contentSource.type}}</span>
          </div>

          <!-- Title -->
          <div class="viewer-section">
            <label>Title</label>
            <div class="viewer-value">{{contentSource.title}}</div>
          </div>

          <!-- Summary -->
          <div class="viewer-section" *ngIf="contentSource.summary">
            <label>Summary</label>
            <div class="viewer-value">{{contentSource.summary}}</div>
          </div>

          <!-- URL (for URL type) -->
          <div class="viewer-section" *ngIf="contentSource.sourceUrl">
            <label>URL</label>
            <div class="viewer-value">
              <a [href]="contentSource.sourceUrl" target="_blank" rel="noopener" class="url-link">
                {{contentSource.sourceUrl}}
                <span class="external-icon">↗</span>
              </a>
            </div>
          </div>

          <!-- File Path (for file types) -->
          <div class="viewer-section" *ngIf="contentSource.filePath && !contentSource.sourceUrl">
            <label>File</label>
            <div class="viewer-value">
              <a [href]="contentSource.filePath" target="_blank" rel="noopener" class="url-link">
                {{contentSource.filePath}}
                <span class="external-icon">↗</span>
              </a>
            </div>
          </div>

          <!-- Full Text (if available and not too long) -->
          <div class="viewer-section" *ngIf="contentSource.fullText && contentSource.fullText.length < 5000">
            <label>Content</label>
            <div class="viewer-value text-content">{{contentSource.fullText}}</div>
          </div>

          <!-- Full Text Preview (if too long) -->
          <div class="viewer-section" *ngIf="contentSource.fullText && contentSource.fullText.length >= 5000">
            <label>Content Preview</label>
            <div class="viewer-value text-content">{{contentSource.fullText.substring(0, 5000)}}...</div>
            <p class="hint">Content truncated ({{contentSource.fullText.length}} characters total)</p>
          </div>

          <!-- Metadata -->
          <div class="viewer-section" *ngIf="hasMetadata()">
            <label>Metadata</label>
            <div class="viewer-value">
              <pre class="metadata-box">{{contentSource.metadata | json}}</pre>
            </div>
          </div>

          <!-- Processed Outputs -->
          <div class="viewer-section" *ngIf="processedOutputs.length > 0">
            <label>Processed Outputs ({{processedOutputs.length}})</label>
            <div class="viewer-value">
              <div class="processed-outputs-list">
                <div *ngFor="let output of processedOutputs" class="processed-output-item">
                  <span class="output-icon">🎯</span>
                  <span class="output-name">{{output.outputName}}</span>
                  <span class="output-type">{{output.outputType}}</span>
                </div>
              </div>
              <p class="hint warning" *ngIf="processedOutputs.length > 0">
                ⚠️ Deleting this content source will also delete {{processedOutputs.length}} processed output(s) and may break interactions that use them.
              </p>
            </div>
          </div>

          <!-- Created Info -->
          <div class="viewer-section" *ngIf="contentSource.createdAt">
            <label>Created</label>
            <div class="viewer-value">{{formatDate(contentSource.createdAt)}}</div>
          </div>

          <!-- Approved Info -->
          <div class="viewer-section" *ngIf="contentSource.approvedAt">
            <label>Approved</label>
            <div class="viewer-value">{{formatDate(contentSource.approvedAt)}}</div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-left">
            <button (click)="close()" class="btn-secondary">Close</button>
          </div>
          <div class="footer-right">
            <button 
              (click)="reprocessContent()" 
              [disabled]="reprocessing || contentSource?.status !== 'approved'"
              class="btn-secondary"
              title="Re-process this content source to update processed outputs">
              🔄 Re-process
            </button>
            <button 
              (click)="confirmDelete()" 
              [disabled]="deleting"
              class="btn-danger"
              title="Delete this content source">
              🗑️ Delete
            </button>
          </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div class="confirmation-overlay" *ngIf="showDeleteConfirm">
          <div class="confirmation-modal" (click)="$event.stopPropagation()">
            <h3>⚠️ Confirm Deletion</h3>
            <p class="warning-text">
              Are you sure you want to delete this content source?
            </p>
            <div class="warning-details" *ngIf="processedOutputs.length > 0">
              <p><strong>This will also delete:</strong></p>
              <ul>
                <li>{{processedOutputs.length}} processed output(s)</li>
                <li>Any interactions that rely on this content</li>
              </ul>
              <p class="warning-note">⚠️ This action cannot be undone!</p>
            </div>
            <div class="confirmation-actions">
              <button (click)="cancelDelete()" class="btn-secondary">Cancel</button>
              <button (click)="deleteContentSource()" [disabled]="deleting" class="btn-danger">
                {{deleting ? 'Deleting...' : 'Delete'}}
              </button>
            </div>
          </div>
        </div>

        <!-- Processing Status -->
        <div class="processing-overlay" *ngIf="reprocessing">
          <div class="processing-modal">
            <div class="spinner"></div>
            <p>{{reprocessMessage}}</p>
          </div>
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
      background: rgba(0, 0, 0, 0.85);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-content {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #333;
      background: #1a1a1a;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: #fff;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #999;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
      line-height: 1;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .modal-body-scrollable {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      background: #0a0a0a;
    }

    .status-section {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #333;
    }

    .status-badge {
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.approved {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .status-badge.pending {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
    }

    .status-badge.rejected {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .content-type-badge {
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
      border: 1px solid rgba(0, 212, 255, 0.3);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .viewer-section {
      margin-bottom: 1.5rem;
    }

    .viewer-section label {
      display: block;
      font-weight: 600;
      color: #00d4ff;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .viewer-value {
      color: #e5e5e5;
      font-size: 0.9375rem;
      line-height: 1.6;
    }

    .url-link {
      color: #00d4ff;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      word-break: break-all;
      transition: color 0.2s;
    }

    .url-link:hover {
      color: #00bce6;
      text-decoration: underline;
    }

    .external-icon {
      font-size: 0.75rem;
      opacity: 0.7;
    }

    .text-content {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 400px;
      overflow-y: auto;
    }

    .metadata-box {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      color: #999;
      font-size: 0.875rem;
      overflow-x: auto;
      max-height: 300px;
      overflow-y: auto;
    }

    .processed-outputs-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .processed-output-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0.5rem;
    }

    .output-icon {
      font-size: 1.25rem;
    }

    .output-name {
      flex: 1;
      color: #fff;
      font-weight: 500;
    }

    .output-type {
      padding: 0.25rem 0.5rem;
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
      border-radius: 0.25rem;
      font-size: 0.75rem;
    }

    .hint {
      font-size: 0.875rem;
      color: #999;
      margin-top: 0.5rem;
    }

    .hint.warning {
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.1);
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(251, 191, 36, 0.2);
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-top: 1px solid #333;
      background: #1a1a1a;
    }

    .footer-left,
    .footer-right {
      display: flex;
      gap: 0.75rem;
    }

    .btn-secondary,
    .btn-danger {
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-secondary {
      background: #2a2a2a;
      color: white;
      border: 1px solid #444;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #333;
      border-color: #555;
    }

    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-danger:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.3);
      border-color: rgba(239, 68, 68, 0.5);
    }

    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .confirmation-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    }

    .confirmation-modal {
      background: #1a1a1a;
      border: 1px solid #ef4444;
      border-radius: 1rem;
      padding: 2rem;
      max-width: 500px;
      width: 90%;
    }

    .confirmation-modal h3 {
      margin: 0 0 1rem 0;
      color: #ef4444;
      font-size: 1.25rem;
    }

    .warning-text {
      color: #e5e5e5;
      margin-bottom: 1rem;
    }

    .warning-details {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 1rem 0;
    }

    .warning-details ul {
      margin: 0.5rem 0;
      padding-left: 1.5rem;
      color: #e5e5e5;
    }

    .warning-note {
      color: #fbbf24;
      font-weight: 600;
      margin-top: 0.75rem;
    }

    .confirmation-actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    .processing-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
    }

    .processing-modal {
      text-align: center;
      color: #fff;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #333;
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ContentSourceViewModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() contentSource: ContentSource | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<string>();
  @Output() reprocessed = new EventEmitter<string>();

  processedOutputs: ProcessedOutput[] = [];
  showDeleteConfirm = false;
  deleting = false;
  reprocessing = false;
  reprocessMessage = 'Re-processing content source...';

  constructor(
    private http: HttpClient,
    private contentSourceService: ContentSourceService
  ) {}

  async refreshContentSource() {
    if (!this.contentSource?.id) return;
    
    try {
      const updated = await this.contentSourceService.getContentSource(this.contentSource.id);
      if (updated) {
        this.contentSource = updated;
        console.log('[ContentSourceView] ✅ Refreshed content source, new status:', updated.status);
      }
    } catch (error) {
      console.error('[ContentSourceView] ❌ Failed to refresh content source:', error);
    }
  }

  ngOnInit() {
    if (this.isOpen && this.contentSource) {
      this.loadProcessedOutputs();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && this.contentSource) {
      this.loadProcessedOutputs();
    }
    if (changes['contentSource'] && this.contentSource) {
      this.loadProcessedOutputs();
    }
  }

  async loadProcessedOutputs() {
    if (!this.contentSource?.id) return;

    try {
      const outputs = await this.http.get<any[]>(
        `${environment.apiUrl}/lesson-editor/processed-outputs/by-content-source?contentSourceId=${this.contentSource.id}`
      ).toPromise();

      // Map to ProcessedOutput format
      this.processedOutputs = (outputs || []).map((output: any) => {
        // Use outputName if available, otherwise construct from content source
        let displayName = output.outputName;
        if (!displayName && this.contentSource) {
          const sourceTitle = this.contentSource.title || this.contentSource.sourceUrl || 'Content';
          displayName = `${sourceTitle} - processed content`;
        }
        return {
          id: output.id,
          outputName: displayName || output.title || output.name || 'Untitled',
          outputType: output.outputType || output.type || 'unknown',
          contentSourceId: output.contentSourceId || this.contentSource?.id,
        };
      });
      console.log('[ContentSourceView] Loaded processed outputs:', this.processedOutputs.length);
    } catch (error) {
      console.error('[ContentSourceView] Failed to load processed outputs:', error);
      this.processedOutputs = [];
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  hasMetadata(): boolean {
    if (!this.contentSource?.metadata) return false;
    const metadata = this.contentSource.metadata;
    if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) return false;
    try {
      return Object.keys(metadata).length > 0;
    } catch {
      return false;
    }
  }

  close() {
    this.showDeleteConfirm = false;
    this.closed.emit();
  }

  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  async deleteContentSource() {
    if (!this.contentSource?.id) return;

    this.deleting = true;
    try {
      await this.contentSourceService.deleteContentSource(this.contentSource.id);
      console.log('[ContentSourceView] ✅ Content source deleted');
      this.deleted.emit(this.contentSource.id);
      this.close();
    } catch (error: any) {
      console.error('[ContentSourceView] ❌ Failed to delete content source:', error);
      alert(`Failed to delete content source: ${error?.message || 'Unknown error'}`);
    } finally {
      this.deleting = false;
    }
  }

  async reprocessContent() {
    if (!this.contentSource?.id || this.contentSource.status !== 'approved') return;

    this.reprocessing = true;
    this.reprocessMessage = 'Re-processing content source...';

    try {
      const userId = environment.defaultUserId || 'system';
      const headers = new HttpHeaders({
        'x-user-id': userId,
        'Content-Type': 'application/json',
      });

      // Always use the reprocess endpoint (which handles both iframe guide URLs and standard content)
      this.reprocessMessage = 'Re-processing content source...';
      await this.http.post(
        `${environment.apiUrl}/content-sources/${this.contentSource.id}/reprocess`,
        {},
        { headers }
      ).toPromise();

      this.reprocessMessage = 'Processing complete!';
      
      // Reload the content source to get updated status
      await this.refreshContentSource();
      
      // Reload processed outputs
      await this.loadProcessedOutputs();
      
      this.reprocessed.emit(this.contentSource.id);
      
      setTimeout(() => {
        this.reprocessing = false;
      }, 1500);
    } catch (error: any) {
      console.error('[ContentSourceView] ❌ Failed to reprocess:', error);
      alert(`Failed to reprocess content: ${error?.message || 'Unknown error'}`);
      this.reprocessing = false;
    }
  }
}

