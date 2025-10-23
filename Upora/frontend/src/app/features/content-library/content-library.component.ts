import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContentSourceService } from '../../core/services/content-source.service';
import { ContentSource, SearchResult } from '../../core/models/content-source.model';

@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-library">
      <!-- Header -->
      <div class="header">
        <h1>Content Library</h1>
        <p>Manage and search your learning content sources</p>
        <div class="header-actions">
          <button (click)="showAddModal = true" class="btn-primary">
            + Add Content Source
          </button>
          <button (click)="navigateToApprovals()" class="btn-secondary" *ngIf="pendingCount > 0">
            ⏳ {{pendingCount}} Pending Approval
          </button>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <div class="search-bar">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search content by keywords, topics..."
            class="search-input">
          <button 
            *ngIf="searchQuery" 
            (click)="clearSearch()" 
            class="clear-btn">
            ✕
          </button>
        </div>
        
        <div class="filters">
          <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option value="url">URLs</option>
            <option value="pdf">PDFs</option>
            <option value="image">Images</option>
            <option value="text">Text</option>
          </select>
          
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="approved">Approved Only</option>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading content sources...</p>
      </div>

      <!-- Search Results (if searching) -->
      <div *ngIf="searchQuery && searchResults.length > 0" class="results-section">
        <h3>Search Results ({{searchResults.length}})</h3>
        <div class="content-grid">
          <div *ngFor="let result of searchResults" class="content-card search-result">
            <div class="content-type-badge">{{result.contentSource?.type || 'url'}}</div>
            <h4>{{result.title}}</h4>
            <p class="summary">{{result.summary}}</p>
            <div class="metadata">
              <span class="relevance">Match: {{(result.relevanceScore * 100).toFixed(0)}}%</span>
              <div class="topics" *ngIf="result.topics?.length > 0">
                <span *ngFor="let topic of result.topics" class="topic-tag">{{topic}}</span>
              </div>
            </div>
            <div class="actions">
              <button (click)="viewContent(result.contentSource)" class="btn-small">View</button>
              <button (click)="linkToLesson(result.contentSourceId)" class="btn-small">Link to Lesson</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Grid (regular list) -->
      <div *ngIf="!searchQuery && !loading" class="results-section">
        <h3>Your Content Sources ({{contentSources.length}})</h3>
        
        <div *ngIf="contentSources.length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3>No content sources yet</h3>
          <p>Start by adding URLs, PDFs, or other learning materials</p>
          <button (click)="showAddModal = true" class="btn-primary">Add Your First Source</button>
        </div>

        <div class="content-grid" *ngIf="contentSources.length > 0">
          <div *ngFor="let source of contentSources" class="content-card" [class.pending]="source.status === 'pending'" [class.rejected]="source.status === 'rejected'">
            <div class="content-header">
              <span class="content-type-badge">{{source.type}}</span>
              <span class="status-badge" [class]="source.status">{{source.status}}</span>
            </div>
            
            <h4>{{source.title || 'Untitled'}}</h4>
            <p class="summary">{{source.summary || 'No summary available'}}</p>
            
            <div class="metadata" *ngIf="source.metadata?.topics?.length">
              <div class="topics">
                <span *ngFor="let topic of source.metadata.topics?.slice(0, 3)" class="topic-tag">{{topic}}</span>
                <span *ngIf="source.metadata.topics.length > 3" class="more">+{{source.metadata.topics.length - 3}} more</span>
              </div>
            </div>

            <div class="source-url" *ngIf="source.sourceUrl">
              <a [href]="source.sourceUrl" target="_blank" rel="noopener">{{truncateUrl(source.sourceUrl)}}</a>
            </div>

            <div class="card-footer">
              <div class="creator" *ngIf="source.creator">
                <small>By {{source.creator.username}}</small>
              </div>
              <div class="actions">
                <button (click)="viewContent(source)" class="btn-small">View</button>
                <button (click)="editContent(source)" class="btn-small" *ngIf="source.status === 'pending'">Edit</button>
                <button (click)="deleteContent(source.id)" class="btn-small btn-danger" *ngIf="source.status !== 'approved'">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add Content Modal -->
      <div class="modal-overlay" *ngIf="showAddModal" (click)="showAddModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h2>Add Content Source</h2>
          
          <div class="form-group">
            <label>Type</label>
            <select [(ngModel)]="newContent.type" class="form-control">
              <option value="url">URL / Web Page</option>
              <option value="pdf">PDF Document</option>
              <option value="text">Text Content</option>
              <option value="image">Image</option>
            </select>
          </div>

          <div class="form-group" *ngIf="newContent.type === 'url'">
            <label>URL</label>
            <input 
              type="url" 
              [(ngModel)]="newContent.sourceUrl"
              placeholder="https://example.com/article"
              class="form-control">
          </div>

          <div class="form-group">
            <label>Title</label>
            <input 
              type="text" 
              [(ngModel)]="newContent.title"
              placeholder="e.g., React Hooks Tutorial"
              class="form-control">
          </div>

          <div class="form-group">
            <label>Summary (Optional)</label>
            <textarea 
              [(ngModel)]="newContent.summary"
              rows="4"
              placeholder="Brief description of the content..."
              class="form-control">
            </textarea>
          </div>

          <div class="modal-actions">
            <button 
              (click)="submitNewContent()" 
              [disabled]="!canSubmit()"
              class="btn-primary">
              {{submitting ? 'Adding...' : 'Add Content'}}
            </button>
            <button (click)="closeAddModal()" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .content-library {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin-bottom: 8px;
    }
    .header p {
      color: #9ca3af;
      margin-bottom: 20px;
    }
    .header-actions {
      display: flex;
      gap: 12px;
    }
    .search-section {
      background: rgba(255,255,255,0.05);
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .search-bar {
      position: relative;
      margin-bottom: 16px;
    }
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: #9ca3af;
    }
    .search-input {
      width: 100%;
      padding: 12px 48px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: white;
      font-size: 16px;
    }
    .search-input:focus {
      outline: none;
      border-color: #ef4444;
    }
    .clear-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 20px;
    }
    .filters {
      display: flex;
      gap: 12px;
    }
    .filter-select {
      padding: 8px 16px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: white;
      cursor: pointer;
    }
    .content-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }
    .content-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s;
    }
    .content-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(239,68,68,0.2);
      border-color: rgba(239,68,68,0.3);
    }
    .content-card.pending {
      border-color: rgba(251,191,36,0.3);
    }
    .content-card.rejected {
      border-color: rgba(156,163,175,0.3);
      opacity: 0.7;
    }
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .content-type-badge {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-badge.approved {
      background: rgba(16,185,129,0.2);
      color: #10b981;
    }
    .status-badge.pending {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
    }
    .status-badge.rejected {
      background: rgba(156,163,175,0.2);
      color: #9ca3af;
    }
    .content-card h4 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .summary {
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .topics {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    .topic-tag {
      background: rgba(239,68,68,0.1);
      color: #ef4444;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
    }
    .more {
      color: #9ca3af;
      font-size: 12px;
    }
    .source-url {
      margin-bottom: 12px;
    }
    .source-url a {
      color: #60a5fa;
      font-size: 12px;
      text-decoration: none;
    }
    .source-url a:hover {
      text-decoration: underline;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .creator small {
      color: #9ca3af;
      font-size: 12px;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .btn-small {
      padding: 6px 12px;
      font-size: 13px;
      border-radius: 6px;
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-small:hover {
      background: rgba(59,130,246,0.3);
    }
    .btn-small.btn-danger {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }
    .btn-small.btn-danger:hover {
      background: rgba(239,68,68,0.3);
    }
    .relevance {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #9ca3af;
    }
    .empty-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      opacity: 0.5;
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

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      padding: 32px;
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-content h2 {
      color: white;
      margin-bottom: 24px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      color: #d1d5db;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .form-control {
      width: 100%;
      padding: 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #ef4444;
    }
    textarea.form-control {
      resize: vertical;
      font-family: inherit;
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .btn-primary {
      background: #ef4444;
      color: white;
      flex: 1;
    }
    .btn-primary:hover:not(:disabled) {
      background: #dc2626;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-secondary:hover {
      background: rgba(255,255,255,0.15);
    }
  `]
})
export class ContentLibraryComponent implements OnInit {
  contentSources: ContentSource[] = [];
  searchResults: SearchResult[] = [];
  searchQuery = '';
  filterType = '';
  filterStatus = 'approved';
  loading = false;
  pendingCount = 0;

  // Add content modal
  showAddModal = false;
  submitting = false;
  newContent: Partial<ContentSource> = {
    type: 'url',
    title: '',
    summary: '',
    sourceUrl: '',
  };

  constructor(
    private contentSourceService: ContentSourceService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadContent();
    await this.loadPendingCount();
  }

  async loadContent() {
    this.loading = true;
    try {
      await this.contentSourceService.loadContentSources(this.filterStatus);
      this.contentSourceService.contentSources$.subscribe(sources => {
        this.contentSources = sources;
      });
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadPendingCount() {
    try {
      await this.contentSourceService.loadContentSources('pending');
      this.contentSourceService.pendingContent$.subscribe(pending => {
        this.pendingCount = pending.length;
      });
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  }

  async onSearchChange(query: string) {
    if (query.length < 2) {
      this.searchResults = [];
      return;
    }

    try {
      this.searchResults = await this.contentSourceService.searchContent(query, 20);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }

  async applyFilters() {
    await this.loadContent();
  }

  async submitNewContent() {
    if (!this.canSubmit()) return;

    this.submitting = true;
    try {
      await this.contentSourceService.createContentSource(this.newContent);
      this.closeAddModal();
      // Reload content
      await this.loadContent();
      await this.loadPendingCount();
    } catch (error) {
      console.error('Failed to create content:', error);
      alert('Failed to add content source');
    } finally {
      this.submitting = false;
    }
  }

  canSubmit(): boolean {
    return !!(this.newContent.title && 
      (this.newContent.sourceUrl || this.newContent.type === 'text'));
  }

  closeAddModal() {
    this.showAddModal = false;
    this.newContent = {
      type: 'url',
      title: '',
      summary: '',
      sourceUrl: '',
    };
  }

  viewContent(source: ContentSource | undefined) {
    if (!source) return;
    console.log('Viewing content:', source);
    // TODO: Navigate to detail page or show modal
  }

  editContent(source: ContentSource) {
    console.log('Editing content:', source);
    // TODO: Open edit modal
  }

  async deleteContent(id: string) {
    if (!confirm('Are you sure you want to delete this content source?')) return;

    try {
      await this.contentSourceService.deleteContentSource(id);
      await this.loadContent();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete content source');
    }
  }

  linkToLesson(contentSourceId: string) {
    console.log('Link to lesson:', contentSourceId);
    // TODO: Show lesson selector modal
  }

  navigateToApprovals() {
    this.router.navigate(['/content-approvals']);
  }

  truncateUrl(url: string): string {
    if (url.length > 50) {
      return url.substring(0, 47) + '...';
    }
    return url;
  }
}

