import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

interface ApprovalItem {
  id: string;
  type: 'youtube_video' | 'quiz' | 'code_editor' | 'slideshow';
  title: string;
  description: string;
  thumbnail?: string;
  submittedAt: string;
  submittedBy: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  processingStep?: string;
  validationScore?: number;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  metadata: any;
}

@Component({
  selector: 'app-approval-queue-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>📋 Approval Queue</h2>
          <div class="header-actions">
            <button (click)="refreshQueue()" class="refresh-btn" [disabled]="refreshing">
              {{refreshing ? '⏳' : '🔄'}} Refresh
            </button>
            <button (click)="close()" class="close-btn">✕</button>
          </div>
        </div>

        <div class="modal-body">
          <!-- Queue Stats -->
          <div class="queue-stats">
            <div class="stat-card">
              <div class="stat-number">{{getPendingCount()}}</div>
              <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{getProcessingCount()}}</div>
              <div class="stat-label">Processing</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{getApprovedCount()}}</div>
              <div class="stat-label">Approved</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{getRejectedCount()}}</div>
              <div class="stat-label">Rejected</div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters">
            <select [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <select [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">All Types</option>
              <option value="youtube_video">YouTube Videos</option>
              <option value="quiz">Quizzes</option>
              <option value="code_editor">Code Editors</option>
              <option value="slideshow">Slideshows</option>
            </select>

            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilters()"
              placeholder="Search content..."
              class="search-input">
          </div>

          <!-- Approval Items List -->
          <div class="approval-list">
            <div *ngIf="filteredItems.length === 0" class="empty-state">
              <div class="empty-icon">📭</div>
              <h3>No items found</h3>
              <p>No content matches your current filters.</p>
            </div>

            <div *ngFor="let item of filteredItems" class="approval-item" [class]="item.status">
              <div class="item-header">
                <div class="item-type">
                  <span class="type-icon">{{getTypeIcon(item.type)}}</span>
                  <span class="type-name">{{getTypeName(item.type)}}</span>
                </div>
                <div class="item-status">
                  <span class="status-badge" [class]="item.status">{{getStatusText(item.status)}}</span>
                  <span class="submitted-time">{{formatTimeAgo(item.submittedAt)}}</span>
                </div>
              </div>

              <div class="item-content">
                <div class="item-preview" *ngIf="item.thumbnail">
                  <img [src]="item.thumbnail" [alt]="item.title" class="preview-thumbnail">
                </div>
                
                <div class="item-details">
                  <h4 class="item-title">{{item.title}}</h4>
                  <p class="item-description">{{truncateText(item.description, 120)}}</p>
                  
                  <div class="item-meta">
                    <span class="submitted-by">By {{item.submittedBy}}</span>
                    <span class="validation-score" *ngIf="item.validationScore">
                      Score: {{item.validationScore}}%
                    </span>
                  </div>
                </div>
              </div>

              <!-- Processing Status -->
              <div class="processing-status" *ngIf="item.status === 'processing'">
                <div class="processing-indicator">
                  <div class="spinner"></div>
                  <span class="processing-text">{{item.processingStep || 'Processing...'}}</span>
                </div>
                <div class="processing-steps">
                  <div class="step" [class.active]="isStepActive(item, 'metadata')">
                    <span class="step-icon">📊</span>
                    <span class="step-text">Extracting Metadata</span>
                  </div>
                  <div class="step" [class.active]="isStepActive(item, 'transcript')">
                    <span class="step-icon">📝</span>
                    <span class="step-text">Fetching Transcript</span>
                  </div>
                  <div class="step" [class.active]="isStepActive(item, 'validation')">
                    <span class="step-icon">🤖</span>
                    <span class="step-text">AI Validation</span>
                  </div>
                  <div class="step" [class.active]="isStepActive(item, 'approval')">
                    <span class="step-icon">✅</span>
                    <span class="step-text">Final Approval</span>
                  </div>
                </div>
              </div>

              <!-- Approval Actions -->
              <div class="item-actions" *ngIf="item.status === 'pending' && canApprove">
                <button (click)="approveItem(item)" class="btn-approve">
                  ✅ Approve
                </button>
                <button (click)="rejectItem(item)" class="btn-reject">
                  ❌ Reject
                </button>
                <button (click)="viewDetails(item)" class="btn-details">
                  👁️ View Details
                </button>
              </div>

              <!-- Rejection Reason -->
              <div class="rejection-reason" *ngIf="item.status === 'rejected' && item.rejectionReason">
                <div class="rejection-header">
                  <span class="rejection-icon">❌</span>
                  <span class="rejection-title">Rejection Reason</span>
                </div>
                <p class="rejection-text">{{item.rejectionReason}}</p>
              </div>

              <!-- Approval Info -->
              <div class="approval-info" *ngIf="item.status === 'approved'">
                <div class="approval-header">
                  <span class="approval-icon">✅</span>
                  <span class="approval-title">Approved</span>
                </div>
                <p class="approval-text">
                  Approved by {{item.approvedBy}} on {{formatDate(item.approvedAt || '')}}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-info">
            <span class="auto-refresh" *ngIf="autoRefresh">
              Auto-refreshing every 5 seconds
            </span>
          </div>
          <div class="footer-actions">
            <button (click)="toggleAutoRefresh()" class="btn-secondary">
              {{autoRefresh ? '⏸️' : '▶️'}} Auto-refresh
            </button>
            <button (click)="close()" class="btn-cancel">Close</button>
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
      background: rgba(0,0,0,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 20px;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .modal-overlay {
        padding: 0;
      }
    }

    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      width: 100%;
      max-width: 1000px;
      max-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    @media (max-width: 768px) {
      .modal-content {
        border-radius: 0;
        max-width: 100%;
        height: 100vh;
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
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .refresh-btn {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      border: 1px solid rgba(59,130,246,0.3);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .refresh-btn:hover:not(:disabled) {
      background: rgba(59,130,246,0.3);
    }
    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
    }
    .close-btn:hover {
      color: white;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }
    .queue-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-number {
      color: white;
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .stat-label {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 500;
    }
    .filters {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .filter-select, .search-input {
      padding: 8px 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      color: white;
      font-size: 14px;
    }
    .filter-select:focus, .search-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .search-input {
      flex: 1;
      min-width: 200px;
    }
    .approval-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #9ca3af;
    }
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .empty-state h3 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .approval-item {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;
    }
    .approval-item:hover {
      border-color: rgba(239,68,68,0.3);
      background: rgba(239,68,68,0.05);
    }
    .approval-item.pending {
      border-left: 4px solid #fbbf24;
    }
    .approval-item.processing {
      border-left: 4px solid #3b82f6;
    }
    .approval-item.approved {
      border-left: 4px solid #10b981;
    }
    .approval-item.rejected {
      border-left: 4px solid #ef4444;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .item-type {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .type-icon {
      font-size: 16px;
    }
    .type-name {
      color: #d1d5db;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .item-status {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.pending {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
    }
    .status-badge.processing {
      background: rgba(59,130,246,0.2);
      color: #3b82f6;
    }
    .status-badge.approved {
      background: rgba(16,185,129,0.2);
      color: #10b981;
    }
    .status-badge.rejected {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }
    .submitted-time {
      color: #9ca3af;
      font-size: 11px;
    }
    .item-content {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }
    .item-preview {
      flex-shrink: 0;
    }
    .preview-thumbnail {
      width: 120px;
      height: 68px;
      object-fit: cover;
      border-radius: 6px;
    }
    .item-details {
      flex: 1;
    }
    .item-title {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .item-description {
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .item-meta {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #9ca3af;
    }
    .validation-score {
      color: #60a5fa;
      font-weight: 600;
    }
    .processing-status {
      background: rgba(59,130,246,0.1);
      border: 1px solid rgba(59,130,246,0.2);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .processing-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(59,130,246,0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .processing-text {
      color: #3b82f6;
      font-size: 14px;
      font-weight: 500;
    }
    .processing-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }
    .step {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.2);
      color: #9ca3af;
      font-size: 12px;
    }
    .step.active {
      background: rgba(59,130,246,0.2);
      color: #3b82f6;
    }
    .step-icon {
      font-size: 14px;
    }
    .item-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    .btn-approve, .btn-reject, .btn-details {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .btn-approve {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      border: 1px solid rgba(16,185,129,0.3);
    }
    .btn-approve:hover {
      background: rgba(16,185,129,0.3);
    }
    .btn-reject {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
      border: 1px solid rgba(239,68,68,0.3);
    }
    .btn-reject:hover {
      background: rgba(239,68,68,0.3);
    }
    .btn-details {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      border: 1px solid rgba(59,130,246,0.3);
    }
    .btn-details:hover {
      background: rgba(59,130,246,0.3);
    }
    .rejection-reason, .approval-info {
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
    }
    .rejection-header, .approval-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .rejection-icon, .approval-icon {
      font-size: 16px;
    }
    .rejection-title, .approval-title {
      color: white;
      font-size: 14px;
      font-weight: 600;
    }
    .rejection-text, .approval-text {
      color: #d1d5db;
      font-size: 13px;
      line-height: 1.4;
      margin: 0;
    }
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      padding-bottom: max(20px, env(safe-area-inset-bottom));
      border-top: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
      background: #1f2937;
    }

    @media (max-width: 768px) {
      .modal-footer {
        padding: 16px;
        padding-bottom: max(16px, env(safe-area-inset-bottom));
        flex-direction: column;
        gap: 12px;
      }
    }
    .footer-info {
      color: #9ca3af;
      font-size: 12px;
    }
    .footer-actions {
      display: flex;
      gap: 12px;
    }
    .btn-secondary, .btn-cancel {
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }
    .btn-cancel {
      background: none;
      color: #9ca3af;
      border: 1px solid rgba(255,255,255,0.2);
    }
    .btn-cancel:hover {
      color: white;
      border-color: rgba(255,255,255,0.3);
    }
  `]
})
export class ApprovalQueueModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() canApprove = true; // Whether current user can approve items
  @Output() itemApproved = new EventEmitter<ApprovalItem>();
  @Output() itemRejected = new EventEmitter<ApprovalItem>();
  @Output() closed = new EventEmitter<void>();

  // Filtering
  statusFilter = '';
  typeFilter = '';
  searchQuery = '';

  // Data
  approvalItems: ApprovalItem[] = [];
  filteredItems: ApprovalItem[] = [];

  // State
  refreshing = false;
  autoRefresh = true;
  private refreshSubscription?: Subscription;

  constructor() {}

  ngOnInit() {
    if (this.isOpen) {
      this.loadApprovalItems();
      this.startAutoRefresh();
    }
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadApprovalItems() {
    // Mock data for testing - in real app this would come from API
    this.approvalItems = [
      {
        id: '1',
        type: 'youtube_video',
        title: 'JavaScript Fundamentals Tutorial',
        description: 'A comprehensive tutorial covering JavaScript basics, variables, functions, and DOM manipulation.',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        submittedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        submittedBy: 'Sarah Johnson',
        status: 'processing',
        processingStep: 'AI Validation',
        validationScore: 85,
        metadata: {
          videoId: 'dQw4w9WgXcQ',
          duration: 212,
          channel: 'CodeAcademy'
        }
      },
      {
        id: '2',
        type: 'youtube_video',
        title: 'React Hooks Explained',
        description: 'Learn about React hooks including useState, useEffect, and custom hooks with practical examples.',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        submittedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        submittedBy: 'Mike Chen',
        status: 'pending',
        validationScore: 92,
        metadata: {
          videoId: 'abc123def456',
          duration: 180,
          channel: 'React Masters'
        }
      },
      {
        id: '3',
        type: 'youtube_video',
        title: 'Python Data Science Basics',
        description: 'Introduction to data science with Python, covering pandas, numpy, and matplotlib.',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        submittedBy: 'Alex Rodriguez',
        status: 'approved',
        approvedBy: 'Admin User',
        approvedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        validationScore: 78,
        metadata: {
          videoId: 'xyz789ghi012',
          duration: 240,
          channel: 'Data Science Pro'
        }
      },
      {
        id: '4',
        type: 'youtube_video',
        title: 'Random Gaming Video',
        description: 'Just playing some games and having fun, not educational content.',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
        submittedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
        submittedBy: 'Gamer123',
        status: 'rejected',
        rejectionReason: 'Content does not appear to be educational. Low educational score (15%) and no clear learning objectives.',
        validationScore: 15,
        metadata: {
          videoId: 'gaming123',
          duration: 120,
          channel: 'Gaming Channel'
        }
      }
    ];

    this.applyFilters();
  }

  applyFilters() {
    this.filteredItems = this.approvalItems.filter(item => {
      const matchesStatus = !this.statusFilter || item.status === this.statusFilter;
      const matchesType = !this.typeFilter || item.type === this.typeFilter;
      const matchesSearch = !this.searchQuery || 
        item.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        item.submittedBy.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      return matchesStatus && matchesType && matchesSearch;
    });
  }

  refreshQueue() {
    this.refreshing = true;
    // Simulate API call
    setTimeout(() => {
      this.loadApprovalItems();
      this.refreshing = false;
    }, 1000);
  }

  startAutoRefresh() {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(5000).subscribe(() => {
        this.refreshQueue();
      });
    }
  }

  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  approveItem(item: ApprovalItem) {
    item.status = 'approved';
    item.approvedBy = 'Current User';
    item.approvedAt = new Date().toISOString();
    this.itemApproved.emit(item);
    this.applyFilters();
  }

  rejectItem(item: ApprovalItem) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      item.status = 'rejected';
      item.rejectionReason = reason;
      this.itemRejected.emit(item);
      this.applyFilters();
    }
  }

  viewDetails(item: ApprovalItem) {
    // TODO: Open detailed view modal
    console.log('View details for:', item);
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
    this.stopAutoRefresh();
  }

  // Utility methods
  getPendingCount(): number {
    return this.approvalItems.filter(item => item.status === 'pending').length;
  }

  getProcessingCount(): number {
    return this.approvalItems.filter(item => item.status === 'processing').length;
  }

  getApprovedCount(): number {
    return this.approvalItems.filter(item => item.status === 'approved').length;
  }

  getRejectedCount(): number {
    return this.approvalItems.filter(item => item.status === 'rejected').length;
  }

  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'youtube_video': '🎥',
      'quiz': '❓',
      'code_editor': '💻',
      'slideshow': '📊'
    };
    return icons[type] || '📄';
  }

  getTypeName(type: string): string {
    const names: { [key: string]: string } = {
      'youtube_video': 'YouTube Video',
      'quiz': 'Quiz',
      'code_editor': 'Code Editor',
      'slideshow': 'Slideshow'
    };
    return names[type] || 'Unknown';
  }

  getStatusText(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  isStepActive(item: ApprovalItem, step: string): boolean {
    if (item.status !== 'processing') return false;
    
    const steps = ['metadata', 'transcript', 'validation', 'approval'];
    const currentStepIndex = steps.indexOf(item.processingStep || 'metadata');
    const targetStepIndex = steps.indexOf(step);
    
    return targetStepIndex <= currentStepIndex;
  }

  formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
