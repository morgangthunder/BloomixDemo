import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContentSourceService } from '../../../core/services/content-source.service';
import { SearchResult } from '../../../core/models/content-source.model';

@Component({
  selector: 'app-content-search-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content-search-widget">
      <div class="widget-header">
        <h4>📚 Find Related Content</h4>
        <p>Search your approved content library to link to this lesson</p>
      </div>

      <div class="search-bar">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearchChange($event)"
          (keyup.enter)="performSearch()"
          placeholder="Search for relevant content..."
          class="search-input">
        <button 
          *ngIf="searchQuery" 
          (click)="clearSearch()" 
          class="clear-btn">
          ✕
        </button>
      </div>

      <!-- Searching State -->
      <div *ngIf="searching" class="searching">
        <div class="spinner"></div>
        <span>Searching...</span>
      </div>

      <!-- Results -->
      <div *ngIf="!searching && searchResults.length > 0" class="results">
        <div class="results-header">
          <h5>{{searchResults.length}} Results</h5>
          <button (click)="clearSearch()" class="clear-results">Clear</button>
        </div>

        <div class="results-list">
          <div *ngFor="let result of searchResults" class="result-item">
            <div class="result-header">
              <span class="type-badge">{{result.contentSource?.type || 'url'}}</span>
              <span class="relevance">{{(result.relevanceScore * 100).toFixed(0)}}% match</span>
            </div>
            
            <h6>{{result.title}}</h6>
            <p class="result-summary">{{result.summary}}</p>
            
            <div class="result-topics" *ngIf="result.topics && result.topics.length > 0">
              <span *ngFor="let topic of result.topics.slice(0, 3)" class="topic">{{topic}}</span>
            </div>

            <div class="result-actions">
              <button (click)="selectContent(result)" class="btn-link">
                ✓ Link to Lesson
              </button>
              <a *ngIf="result.sourceUrl" [href]="result.sourceUrl" target="_blank" class="btn-view">
                View Source →
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div *ngIf="!searching && searchQuery && searchResults.length === 0" class="no-results">
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <p>No content found for "{{searchQuery}}"</p>
        <small>Try different keywords or add new content to your library</small>
      </div>

      <!-- Linked Content -->
      <div *ngIf="linkedContentIds.length > 0" class="linked-section">
        <h5>Linked Content ({{linkedContentIds.length}})</h5>
        <div class="linked-list">
          <div *ngFor="let id of linkedContentIds" class="linked-item">
            <span>📎 Content ID: {{id.substring(0, 8)}}...</span>
            <button (click)="removeLink(id)" class="btn-remove">✕</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .content-search-widget {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .widget-header h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .widget-header p {
      color: #9ca3af;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .search-bar {
      position: relative;
      margin-bottom: 16px;
    }
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: #9ca3af;
    }
    .search-input {
      width: 100%;
      padding: 10px 40px 10px 40px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      color: white;
      font-size: 14px;
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
      font-size: 18px;
    }
    .searching {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 20px;
      color: #9ca3af;
      font-size: 14px;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(239,68,68,0.2);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .results {
      max-height: 400px;
      overflow-y: auto;
    }
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .results-header h5 {
      color: white;
      font-size: 14px;
      font-weight: 600;
    }
    .clear-results {
      background: none;
      border: none;
      color: #60a5fa;
      cursor: pointer;
      font-size: 13px;
    }
    .results-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .result-item {
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 14px;
      transition: all 0.2s;
    }
    .result-item:hover {
      border-color: rgba(239,68,68,0.3);
      background: rgba(239,68,68,0.05);
    }
    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .type-badge {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .relevance {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }
    .result-item h6 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .result-summary {
      color: #d1d5db;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 8px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .result-topics {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .topic {
      background: rgba(239,68,68,0.1);
      color: #ef4444;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
    }
    .result-actions {
      display: flex;
      gap: 10px;
    }
    .btn-link {
      background: rgba(16,185,129,0.2);
      color: #10b981;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-link:hover {
      background: rgba(16,185,129,0.3);
    }
    .btn-view {
      color: #60a5fa;
      text-decoration: none;
      font-size: 12px;
      padding: 6px 14px;
    }
    .btn-view:hover {
      text-decoration: underline;
    }
    .no-results {
      text-align: center;
      padding: 40px 20px;
      color: #9ca3af;
    }
    .no-results .icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 12px;
      opacity: 0.5;
    }
    .no-results p {
      font-size: 14px;
      margin-bottom: 6px;
    }
    .no-results small {
      font-size: 12px;
    }
    .linked-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.1);
    }
    .linked-section h5 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .linked-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .linked-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.2);
      border-radius: 6px;
      padding: 10px 14px;
    }
    .linked-item span {
      color: #10b981;
      font-size: 13px;
    }
    .btn-remove {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 16px;
      padding: 0 8px;
    }
    .btn-remove:hover {
      color: #dc2626;
    }
  `]
})
export class ContentSearchWidgetComponent {
  @Input() lessonId?: string;
  @Output() contentLinked = new EventEmitter<string>();
  @Output() contentUnlinked = new EventEmitter<string>();

  searchQuery = '';
  searchResults: SearchResult[] = [];
  searching = false;
  linkedContentIds: string[] = [];

  constructor(private contentSourceService: ContentSourceService) {}

  async onSearchChange(query: string) {
    if (query.length < 2) {
      this.searchResults = [];
      return;
    }

    // Debounce would be good here
    await this.performSearch();
  }

  async performSearch() {
    if (!this.searchQuery || this.searchQuery.length < 2) return;

    this.searching = true;
    try {
      this.searchResults = await this.contentSourceService.searchContent(this.searchQuery, 10);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      this.searching = false;
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchResults = [];
  }

  async selectContent(result: SearchResult) {
    if (!this.lessonId) {
      console.warn('No lessonId provided, cannot link content');
      alert('Please save the lesson first before linking content');
      return;
    }

    try {
      await this.contentSourceService.linkToLesson(
        this.lessonId,
        result.contentSourceId,
        result.relevanceScore
      );

      this.linkedContentIds.push(result.contentSourceId);
      this.contentLinked.emit(result.contentSourceId);

      // Remove from results
      this.searchResults = this.searchResults.filter(r => r.contentSourceId !== result.contentSourceId);

      console.log(`[ContentSearchWidget] Linked ${result.title} to lesson`);
    } catch (error) {
      console.error('Failed to link content:', error);
      alert('Failed to link content to lesson');
    }
  }

  async removeLink(contentSourceId: string) {
    if (!this.lessonId) return;

    try {
      await this.contentSourceService.unlinkFromLesson(this.lessonId, contentSourceId);
      this.linkedContentIds = this.linkedContentIds.filter(id => id !== contentSourceId);
      this.contentUnlinked.emit(contentSourceId);

      console.log(`[ContentSearchWidget] Unlinked content from lesson`);
    } catch (error) {
      console.error('Failed to unlink content:', error);
    }
  }

  async loadLinkedContent() {
    if (!this.lessonId) return;

    try {
      const linked = await this.contentSourceService.getLinkedContent(this.lessonId);
      this.linkedContentIds = linked.map(c => c.id);
      console.log(`[ContentSearchWidget] Loaded ${linked.length} linked content sources`);
    } catch (error) {
      console.error('Failed to load linked content:', error);
    }
  }
}

