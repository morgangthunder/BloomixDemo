import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentSourceService } from '../../core/services/content-source.service';
import { ContentSource } from '../../core/models/content-source.model';

@Component({
  selector: 'app-content-approvals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="approvals-page">
      <div class="header">
        <button (click)="goBack()" class="back-btn">← Back to Library</button>
        <h1>Content Approval Queue</h1>
        <p>Review and approve content sources before they're indexed for search</p>
      </div>

      <!-- Stats -->
      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">{{pendingContent.length}}</div>
          <div class="stat-label">Pending Approval</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{approvedToday}}</div>
          <div class="stat-label">Approved Today</div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading pending content...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && pendingContent.length === 0" class="empty-state">
        <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3>All caught up!</h3>
        <p>No content sources pending approval</p>
      </div>

      <!-- Pending Content List -->
      <div *ngIf="!loading && pendingContent.length > 0" class="pending-list">
        <div *ngFor="let source of pendingContent" class="approval-card">
          <div class="card-header">
            <div class="type-info">
              <span class="type-badge">{{source.type}}</span>
              <h3>{{source.title || 'Untitled'}}</h3>
            </div>
            <span class="pending-badge">Pending</span>
          </div>

          <div class="card-body">
            <!-- Source URL -->
            <div class="field" *ngIf="source.sourceUrl">
              <label>Source:</label>
              <a [href]="source.sourceUrl" target="_blank" rel="noopener">
                {{source.sourceUrl}}
              </a>
            </div>

            <!-- Summary -->
            <div class="field" *ngIf="source.summary">
              <label>Summary:</label>
              <p>{{source.summary}}</p>
            </div>

            <!-- Metadata -->
            <div class="field" *ngIf="source.metadata && source.metadata.topics && source.metadata.topics.length > 0">
              <label>Topics:</label>
              <div class="topics">
                <span *ngFor="let topic of source.metadata.topics" class="topic-tag">{{topic}}</span>
              </div>
            </div>

            <div class="field" *ngIf="source.metadata && source.metadata.keywords && source.metadata.keywords.length > 0">
              <label>Keywords:</label>
              <div class="keywords">
                <span *ngFor="let keyword of source.metadata.keywords.slice(0, 10)" class="keyword-tag">{{keyword}}</span>
              </div>
            </div>

            <!-- Creator Info -->
            <div class="field" *ngIf="source.creator">
              <label>Submitted by:</label>
              <span>{{source.creator.username}} ({{source.creator.email}})</span>
            </div>

            <div class="field">
              <label>Submitted:</label>
              <span>{{formatDate(source.createdAt)}}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="card-actions">
            <div class="rejection-section" *ngIf="showRejectForm === source.id">
              <textarea 
                [(ngModel)]="rejectionReason"
                placeholder="Enter rejection reason..."
                class="rejection-input"
                rows="3">
              </textarea>
              <div class="rejection-actions">
                <button (click)="confirmReject(source.id)" class="btn-danger">
                  Confirm Reject
                </button>
                <button (click)="cancelReject()" class="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>

            <div class="action-buttons" *ngIf="showRejectForm !== source.id">
              <button (click)="approveContent(source.id)" class="btn-approve" [disabled]="processing">
                {{processing ? 'Processing...' : '✓ Approve'}}
              </button>
              <button (click)="startReject(source.id)" class="btn-reject" [disabled]="processing">
                ✕ Reject
              </button>
              <button (click)="viewSource(source)" class="btn-view">
                👁️ View
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approvals-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 30px;
    }
    .back-btn {
      background: none;
      border: none;
      color: #60a5fa;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .back-btn:hover {
      color: #3b82f6;
    }
    .header h1 {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin-bottom: 8px;
    }
    .header p {
      color: #9ca3af;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #ef4444;
      margin-bottom: 8px;
    }
    .stat-label {
      color: #9ca3af;
      font-size: 14px;
    }
    .pending-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .approval-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(251,191,36,0.3);
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s;
    }
    .approval-card:hover {
      border-color: rgba(251,191,36,0.5);
      box-shadow: 0 4px 16px rgba(251,191,36,0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 20px;
    }
    .type-info {
      flex: 1;
    }
    .type-badge {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-right: 12px;
    }
    .card-header h3 {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin-top: 8px;
    }
    .pending-badge {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
      padding: 6px 16px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
    }
    .card-body {
      margin-bottom: 20px;
    }
    .field {
      margin-bottom: 16px;
    }
    .field label {
      display: block;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .field p, .field span {
      color: #d1d5db;
      line-height: 1.6;
    }
    .field a {
      color: #60a5fa;
      text-decoration: none;
      word-break: break-all;
    }
    .field a:hover {
      text-decoration: underline;
    }
    .topics, .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .topic-tag {
      background: rgba(239,68,68,0.1);
      color: #ef4444;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
    }
    .keyword-tag {
      background: rgba(59,130,246,0.1);
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
    }
    .card-actions {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 20px;
    }
    .action-buttons {
      display: flex;
      gap: 12px;
    }
    .btn-approve {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      padding: 10px 24px;
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-approve:hover:not(:disabled) {
      background: rgba(16,185,129,0.3);
      border-color: rgba(16,185,129,0.5);
    }
    .btn-approve:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-reject {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
      padding: 10px 24px;
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-reject:hover:not(:disabled) {
      background: rgba(239,68,68,0.3);
      border-color: rgba(239,68,68,0.5);
    }
    .btn-reject:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-view {
      background: rgba(255,255,255,0.1);
      color: white;
      padding: 10px 20px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-view:hover {
      background: rgba(255,255,255,0.15);
    }
    .rejection-section {
      margin-bottom: 16px;
    }
    .rejection-input {
      width: 100%;
      padding: 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 8px;
      color: white;
      font-family: inherit;
      margin-bottom: 12px;
      resize: vertical;
    }
    .rejection-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .rejection-actions {
      display: flex;
      gap: 12px;
    }
    .btn-danger {
      background: #ef4444;
      color: white;
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #9ca3af;
    }
    .check-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      color: #10b981;
    }
    .empty-state h3 {
      color: white;
      margin-bottom: 8px;
    }
    .loading {
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
  `]
})
export class ContentApprovalsComponent implements OnInit {
  pendingContent: ContentSource[] = [];
  loading = false;
  processing = false;
  showRejectForm: string | null = null;
  rejectionReason = '';
  approvedToday = 0;

  constructor(
    private contentSourceService: ContentSourceService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadPendingContent();
  }

  async loadPendingContent() {
    this.loading = true;
    try {
      await this.contentSourceService.loadContentSources('pending');
      this.contentSourceService.pendingContent$.subscribe(pending => {
        this.pendingContent = pending;
      });
    } catch (error) {
      console.error('Failed to load pending content:', error);
    } finally {
      this.loading = false;
    }
  }

  async approveContent(id: string) {
    if (!confirm('Approve this content source? It will be indexed in Weaviate for semantic search.')) {
      return;
    }

    this.processing = true;
    try {
      const approved = await this.contentSourceService.approveContent(id);
      console.log('Approved:', approved);
      
      // Show success message
      alert(`✅ Content approved and indexed in Weaviate!\nWeaviate ID: ${approved.weaviateId}`);
      
      this.approvedToday++;
      await this.loadPendingContent();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve content source');
    } finally {
      this.processing = false;
    }
  }

  startReject(id: string) {
    this.showRejectForm = id;
    this.rejectionReason = '';
  }

  cancelReject() {
    this.showRejectForm = null;
    this.rejectionReason = '';
  }

  async confirmReject(id: string) {
    if (!this.rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    this.processing = true;
    try {
      await this.contentSourceService.rejectContent(id, this.rejectionReason);
      console.log('Rejected:', id);
      
      alert('Content source rejected');
      this.cancelReject();
      await this.loadPendingContent();
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('Failed to reject content source');
    } finally {
      this.processing = false;
    }
  }

  viewSource(source: ContentSource) {
    if (source.sourceUrl) {
      window.open(source.sourceUrl, '_blank');
    }
  }

  goBack() {
    this.router.navigate(['/content-library']);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }
}

