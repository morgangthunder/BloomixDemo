import { Component, EventEmitter, Output, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface ContentSource {
  id: string;
  type: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  filePath?: string;
  contentCategory?: 'source_content' | 'processed_content';
  videoId?: string;
  channel?: string;
  transcript?: string;
  metadata: {
    topics: string[];
    keywords: string[];
    difficulty: string;
    language: string;
  };
  status: string;
  createdBy: string;
  createdAt: string;
  relevanceScore?: number;
}

interface SearchResult {
  title: string;
  relevanceScore: number;
  contentSource: ContentSource;
}

@Component({
  selector: 'app-content-library-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>📚 Content Library</h2>
          <button (click)="close()" class="close-btn">✕</button>
        </div>

        <div class="modal-body">
          <!-- Search Section -->
          <div class="search-section">
            <div class="search-bar">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="search()"
                placeholder="Search content library (e.g., 'JavaScript arrays', 'Python loops')..."
                class="search-input"
                autofocus>
              <button (click)="search()" [disabled]="searching || !searchQuery.trim()" class="search-btn">
                {{searching ? '🔍 Searching...' : '🔍 Search'}}
              </button>
            </div>
            
            <div class="search-filters" *ngIf="!searching && !searchResults.length">
              <h4>💡 Search Tips:</h4>
              <ul>
                <li>Use keywords like "variables", "loops", "functions"</li>
                <li>Specify topics: "React hooks", "Python data types"</li>
                <li>Search by difficulty: "beginner JavaScript"</li>
              </ul>
            </div>
          </div>

          <!-- Search Results -->
          <div class="results-section" *ngIf="searchResults.length > 0">
            <h3>Found {{searchResults.length}} Results</h3>
            <div class="results-list">
              <div 
                *ngFor="let result of searchResults" 
                class="result-card"
                [class.selected]="selectedContent?.id === result.contentSource.id"
                (click)="selectContent(result.contentSource)">
                
                <div class="result-header">
                  <div class="result-badges">
                    <span class="result-category" [class.source]="result.contentSource.contentCategory === 'source_content'" [class.processed]="result.contentSource.contentCategory === 'processed_content'">
                      {{result.contentSource.contentCategory === 'processed_content' ? '🎬 Processed' : '📚 Source'}}
                    </span>
                    <span class="result-type">{{result.contentSource.type}}</span>
                  </div>
                  <span class="result-score">{{(result.relevanceScore * 100).toFixed(0)}}% match</span>
                </div>
                
                <h4 class="result-title">{{result.contentSource.title}}</h4>
                
                <p class="result-summary">{{truncate(result.contentSource.summary, 150)}}</p>
                
                <div class="result-meta">
                  <span class="meta-item" *ngIf="result.contentSource.metadata.difficulty">
                    📊 {{result.contentSource.metadata.difficulty}}
                  </span>
                  <span class="meta-item" *ngIf="result.contentSource.metadata.topics?.length">
                    🏷️ {{result.contentSource.metadata.topics.slice(0, 3).join(', ')}}
                  </span>
                </div>
                
                <div class="result-actions" *ngIf="selectedContent?.id === result.contentSource.id">
                  <button (click)="viewDetails($event)" class="btn-small">👁️ View Details</button>
                  <button (click)="addToLesson($event)" class="btn-small btn-primary">➕ Add to Lesson</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div class="empty-state" *ngIf="!searching && !searchResults.length && searchAttempted">
            <div class="empty-icon">🔍</div>
            <h3>No Results Found</h3>
            <p>Try different keywords or check the Content Library page to see all available content.</p>
          </div>

          <!-- Searching State -->
          <div class="searching-state" *ngIf="searching">
            <div class="spinner"></div>
            <p>Searching content library...</p>
          </div>

          <!-- Content Details Panel -->
          <div class="details-panel" *ngIf="showDetails && selectedContent">
            <div class="details-header">
              <h3>{{selectedContent.title}}</h3>
              <button (click)="closeDetails()" class="close-btn">✕</button>
            </div>
            
            <div class="details-body">
              <div class="detail-section">
                <label>Type:</label>
                <span>{{selectedContent.type}}</span>
              </div>
              
              <div class="detail-section" *ngIf="selectedContent.sourceUrl">
                <label>Source:</label>
                <a [href]="selectedContent.sourceUrl" target="_blank">{{selectedContent.sourceUrl}}</a>
              </div>
              
              <div class="detail-section">
                <label>Summary:</label>
                <p>{{selectedContent.summary}}</p>
              </div>
              
              <div class="detail-section" *ngIf="selectedContent.metadata.topics?.length">
                <label>Topics:</label>
                <div class="tags">
                  <span *ngFor="let topic of selectedContent.metadata.topics" class="tag">{{topic}}</span>
                </div>
              </div>
              
              <div class="detail-section" *ngIf="selectedContent.metadata.keywords?.length">
                <label>Keywords:</label>
                <div class="tags">
                  <span *ngFor="let keyword of selectedContent.metadata.keywords" class="tag-small">{{keyword}}</span>
                </div>
              </div>
              
              <div class="detail-actions">
                <button (click)="addToLesson($event)" class="btn-primary">➕ Add to Lesson</button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button (click)="close()" class="btn-secondary">Cancel</button>
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
      background: rgba(0, 0, 0, 0.95);
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
      background: #1a1a1a;
      border-radius: 12px;
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
      padding: 1.5rem;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: #e5e5e5;
    }

    .close-btn {
      background: none;
      border: none;
      color: #999;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
      line-height: 1;
      transition: color 0.2s;
    }

    .close-btn:hover {
      color: #fff;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .search-section {
      margin-bottom: 2rem;
    }

    .search-bar {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      color: #e5e5e5;
      font-size: 1rem;
    }

    .search-input:focus {
      outline: none;
      border-color: #cc0000;
    }

    .search-btn {
      background: #cc0000;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .search-btn:hover:not(:disabled) {
      background: #b30000;
    }

    .search-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .search-filters {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 1rem;
    }

    .search-filters h4 {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      color: #999;
    }

    .search-filters ul {
      margin: 0;
      padding-left: 1.5rem;
      color: #777;
      font-size: 0.875rem;
    }

    .search-filters li {
      margin-bottom: 0.25rem;
    }

    .results-section h3 {
      margin: 0 0 1rem;
      font-size: 1.125rem;
      color: #e5e5e5;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .result-card {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .result-card:hover {
      border-color: #cc0000;
      background: #141414;
    }

    .result-card.selected {
      border-color: #cc0000;
      background: #1a1a1a;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .result-badges {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .result-category {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .result-category.source {
      background: #1a4d2e;
      color: #4ade80;
    }

    .result-category.processed {
      background: #1e3a8a;
      color: #60a5fa;
    }

    .result-type {
      background: #333;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #999;
    }

    .result-score {
      font-size: 0.875rem;
      color: #cc0000;
      font-weight: 600;
    }

    .result-title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      color: #e5e5e5;
    }

    .result-summary {
      margin: 0 0 0.75rem;
      color: #999;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .result-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .meta-item {
      font-size: 0.75rem;
      color: #777;
    }

    .result-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #333;
    }

    .btn-small {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-small:hover {
      background: #222;
      border-color: #cc0000;
    }

    .btn-small.btn-primary {
      background: #cc0000;
      border-color: #cc0000;
    }

    .btn-small.btn-primary:hover {
      background: #b30000;
    }

    .empty-state,
    .searching-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #777;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0 0 0.5rem;
      color: #999;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #333;
      border-top-color: #cc0000;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .details-panel {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 400px;
      background: #1a1a1a;
      border-left: 1px solid #333;
      box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      z-index: 1001;
    }

    .details-header {
      padding: 1.5rem;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .details-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #e5e5e5;
      flex: 1;
    }

    .details-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-section label {
      display: block;
      font-size: 0.875rem;
      color: #999;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .detail-section p {
      margin: 0;
      color: #ccc;
      line-height: 1.6;
    }

    .detail-section a {
      color: #cc0000;
      text-decoration: none;
    }

    .detail-section a:hover {
      text-decoration: underline;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .tag {
      background: #333;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #e5e5e5;
    }

    .tag-small {
      background: #222;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-size: 0.7rem;
      color: #999;
    }

    .detail-actions {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #333;
    }

    .btn-primary {
      background: #cc0000;
      border: none;
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      width: 100%;
      transition: background 0.2s;
    }

    .btn-primary:hover {
      background: #b30000;
    }

    .modal-footer {
      padding: 16px 20px;
      padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #333;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
      background: #1a1a1a;
      min-height: 64px;
    }

    @media (max-width: 768px) {
      .modal-footer {
        padding: 12px 16px;
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      }
    }

    .btn-secondary {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem 1.5rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #222;
      border-color: #cc0000;
    }
  `]
})
export class ContentLibraryModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() lessonId?: string;
  @Output() contentAdded = new EventEmitter<any>();
  @Output() closed = new EventEmitter<void>();

  searchQuery = '';
  searching = false;
  searchAttempted = false;
  searchResults: SearchResult[] = [];
  selectedContent: ContentSource | null = null;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      const header = document.querySelector('app-header');
      if (header) {
        (header as HTMLElement).style.display = this.isOpen ? 'none' : '';
      }
      document.body.style.overflow = this.isOpen ? 'hidden' : '';
    }
  }
  showDetails = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    console.log('[ContentLibrary] Component initialized - lessonId:', this.lessonId);
  }

  async search() {
    if (!this.searchQuery.trim()) return;

    console.log('[ContentLibrary] 🔍 Searching for:', this.searchQuery);
    this.searching = true;
    this.searchAttempted = true;

    try {
      const payload = {
        query: this.searchQuery,
        tenantId: environment.tenantId,
        limit: 20
      };

      console.log('[ContentLibrary] 📤 Sending search request:', payload);

      const response = await this.http.post<SearchResult[]>(
        `${environment.apiUrl}/content-sources/search`,
        payload
      ).toPromise();

      console.log('[ContentLibrary] ✅ Search results:', response);
      this.searchResults = response || [];

    } catch (error: any) {
      console.error('[ContentLibrary] ❌ Search failed:', error);
      this.searchResults = [];
    } finally {
      this.searching = false;
    }
  }

  selectContent(content: ContentSource) {
    console.log('[ContentLibrary] Selected content:', content.title);
    this.selectedContent = content;
  }

  viewDetails(event: Event) {
    event.stopPropagation();
    console.log('[ContentLibrary] Viewing details for:', this.selectedContent?.title);
    this.showDetails = true;
  }

  closeDetails() {
    this.showDetails = false;
  }

  async addToLesson(event: Event) {
    event.stopPropagation();
    
    if (!this.selectedContent || !this.lessonId) {
      console.error('[ContentLibrary] Cannot add: missing content or lessonId');
      return;
    }

    console.log('[ContentLibrary] ➕ Adding content to lesson:', this.lessonId);

    try {
      const payload = {
        lessonId: this.lessonId,
        contentSourceId: this.selectedContent.id,
        relevanceScore: this.selectedContent.relevanceScore || 0.5,
        useInContext: true
      };

      const response = await this.http.post(
        `${environment.apiUrl}/content-sources/link-to-lesson`,
        payload
      ).toPromise();

      console.log('[ContentLibrary] ✅ Content linked to lesson:', response);

      // Emit event to parent
      this.contentAdded.emit({
        content: this.selectedContent,
        link: response
      });

      // Close modal
      this.close();

    } catch (error: any) {
      console.error('[ContentLibrary] ❌ Failed to link content:', error);
      alert('Failed to add content to lesson: ' + (error.error?.message || error.message));
    }
  }

  close() {
    this.isOpen = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedContent = null;
    this.showDetails = false;
    this.searchAttempted = false;
    this.closed.emit();
  }

  truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  }
}

