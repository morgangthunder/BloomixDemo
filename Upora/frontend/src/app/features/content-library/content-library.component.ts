import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { ContentSourceService } from '../../core/services/content-source.service';
import { ContentSource, SearchResult } from '../../core/models/content-source.model';
import { ContentProcessorModalComponent } from '../../shared/components/content-processor-modal/content-processor-modal.component';
import { AddTextContentModalComponent } from '../../shared/components/add-text-content-modal/add-text-content-modal.component';
import { AddImageModalComponent } from '../../shared/components/add-image-modal/add-image-modal.component';
import { AddPdfModalComponent } from '../../shared/components/add-pdf-modal/add-pdf-modal.component';
import { AddMediaModalComponent } from '../../shared/components/add-media-modal/add-media-modal.component';
import { ApprovalQueueModalComponent } from '../../shared/components/approval-queue-modal/approval-queue-modal.component';
import { ContentSourceViewModalComponent } from '../../shared/components/content-source-view-modal/content-source-view-modal.component';
import { ProcessedContentService, ProcessedContentItem } from '../../core/services/processed-content.service';
import { ToastService } from '../../core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DEFAULT_LESSON_ID, isDefaultLessonId } from '../../core/constants/default-lesson-id';

@Component({
  selector: 'app-content-library',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent,
    ContentProcessorModalComponent,
    AddTextContentModalComponent,
    AddImageModalComponent,
    AddPdfModalComponent,
    AddMediaModalComponent,
    ApprovalQueueModalComponent,
    ContentSourceViewModalComponent
  ],
  template: `
    <ion-content>
    <div class="content-library">
      <!-- Header -->
      <div class="header">
        <h1>Content Library</h1>
        <p>Manage and search your learning content sources</p>
        <div class="header-actions">
          <button (click)="toggleAddMenu()" class="btn-primary">
            + Add Content Source
          </button>
          <button (click)="navigateToApprovals()" class="btn-secondary" *ngIf="pendingCount > 0">
            ⏳ {{pendingCount}} Pending Approval
          </button>
        </div>
        
      </div>

      <!-- Add Content Menu Overlay -->
      <div class="add-menu-overlay" *ngIf="showAddMenu" (click)="closeAddMenu()">
        <div class="add-menu" (click)="$event.stopPropagation()">
          <div class="add-menu-header">
            <h3>Add & Process Content</h3>
            <button (click)="closeAddMenu()" class="close-btn">&times;</button>
          </div>
          <div class="add-menu-content">
            <div class="add-menu-section">
              <h4>Add Source Content</h4>
              <button (click)="openUrlModal()" class="menu-item-btn">🔗 Paste URL</button>
              <button (click)="openPdfModal()" class="menu-item-btn">📄 Upload PDF</button>
              <button (click)="openTextModal()" class="menu-item-btn">📝 Add Text Content</button>
              <button (click)="openImageModal()" class="menu-item-btn">🖼️ Upload Image</button>
              <button (click)="openMediaModal()" class="menu-item-btn">🎬 Upload Media (Video/Audio)</button>
            </div>
            <div class="add-menu-section separator">
              <h4>Browse Existing</h4>
              <button (click)="openApprovalModal()" class="menu-item-btn">⏳ Approval Queue</button>
            </div>
          </div>
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
        
        <div class="filters" *ngIf="activeTab === 'sources'">
          <select [(ngModel)]="filterType" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">All Types</option>
            <option value="url">URLs</option>
            <option value="pdf">PDFs</option>
            <option value="image">Images</option>
            <option value="text">Text</option>
            <option value="media">Media</option>
          </select>
          
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" class="filter-select">
            <option value="">All Status</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'sources'"
          (click)="activeTab = 'sources'">
          📚 Content Sources ({{getFilteredContentSources().length}})
        </button>
        <button 
          class="tab-btn"
          [class.active]="activeTab === 'processed'"
          (click)="activeTab = 'processed'; loadProcessedContent()">
          🔧 Processed Content ({{getFilteredProcessedContent().length}})
        </button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading content sources...</p>
      </div>

      <!-- Content Sources Tab -->
      <div *ngIf="!loading && activeTab === 'sources'" class="results-section">
        <div *ngIf="getFilteredContentSources().length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <h3>No content sources yet</h3>
          <p>Start by adding URLs, PDFs, or other learning materials</p>
          <button (click)="toggleAddMenu()" class="btn-primary">Add Your First Source</button>
        </div>

        <div class="content-grid" *ngIf="getFilteredContentSources().length > 0">
          <div *ngFor="let source of getFilteredContentSources()" class="content-card" [class.pending]="source.status === 'pending'" [class.rejected]="source.status === 'rejected'">
            <div class="content-header">
              <span class="content-type-badge">{{source.type}}</span>
              <span class="status-badge" [class]="source.status">{{source.status}}</span>
            </div>
            
            <h4>{{source.title || 'Untitled'}}</h4>
            <p class="summary">{{source.summary || 'No summary available'}}</p>
            
            <div class="metadata" *ngIf="source.metadata && source.metadata.topics && source.metadata.topics.length > 0">
              <div class="topics">
                <span *ngFor="let topic of source.metadata.topics.slice(0, 3)" class="topic-tag">{{topic}}</span>
                <span *ngIf="source.metadata.topics.length > 3" class="more">+{{source.metadata.topics.length - 3}} more</span>
              </div>
            </div>

            <div class="source-url" *ngIf="source.sourceUrl">
              <a [href]="source.sourceUrl" target="_blank" rel="noopener">{{truncateUrl(source.sourceUrl)}}</a>
            </div>

            <div class="lesson-usage" *ngIf="getLessonsForContentSource(source.id).length > 0">
              <div class="usage-label">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                Used in {{getLessonsForContentSource(source.id).length}} lesson{{getLessonsForContentSource(source.id).length !== 1 ? 's' : ''}}:
              </div>
              <div class="lesson-tags">
                <span *ngFor="let lesson of getLessonsForContentSource(source.id).slice(0, 3)" class="lesson-tag">{{lesson.title}}</span>
                <span *ngIf="getLessonsForContentSource(source.id).length > 3" class="more-tag">+{{getLessonsForContentSource(source.id).length - 3}} more</span>
              </div>
            </div>
            <div class="lesson-usage" *ngIf="getLessonsForContentSource(source.id).length === 0">
              <div class="usage-label">
                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                <small style="color: #9ca3af;">No associated lessons</small>
              </div>
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

      <!-- Processed Content Tab -->
      <div *ngIf="!loading && activeTab === 'processed'" class="results-section">
        <div *ngIf="getFilteredProcessedContent().length === 0" class="empty-state">
          <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <h3>No processed content found</h3>
          <p *ngIf="searchQuery">Try a different search term</p>
          <p *ngIf="!searchQuery">Process some source content to see outputs here</p>
          <button *ngIf="!searchQuery" (click)="activeTab = 'sources'" class="btn-primary">Go to Content Sources</button>
          <button *ngIf="searchQuery" (click)="clearSearch()" class="btn-primary">Clear Search</button>
        </div>

        <div class="content-grid" *ngIf="getFilteredProcessedContent().length > 0">
          <div *ngFor="let item of getFilteredProcessedContent()" class="content-card">
            <div class="content-header">
              <span class="content-type-badge">{{item.type || 'processed'}}</span>
            </div>
            
            <h4>{{item.title || 'Untitled'}}</h4>
            <p class="summary">{{item.description || 'No description available'}}</p>
            
            <div class="source-link-section" *ngIf="item.contentSource">
              <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <small>Source: {{item.contentSource.title}}</small>
            </div>

            <div class="lesson-info" *ngIf="item.lessonId">
              <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <small>Lesson: {{getLessonTitle(item.lessonId)}}</small>
            </div>

            <div class="card-footer">
              <div class="actions">
                <button (click)="viewProcessedContent(item)" class="btn-small">View Details</button>
                <button (click)="deleteProcessedContent(item.id)" class="btn-small btn-danger">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Modals -->
      <app-content-processor-modal
        [isOpen]="showUrlModal"
        (closed)="closeUrlModal()"
        (contentProcessed)="onContentProcessed($event)"
        (contentSubmittedForApproval)="onContentSubmitted($event)">
      </app-content-processor-modal>

      <app-add-pdf-modal
        [isOpen]="showPdfModal"
        (close)="closePdfModal()"
        (contentAdded)="onContentAdded($event)">
      </app-add-pdf-modal>

      <app-add-text-content-modal
        [isOpen]="showTextModal"
        (close)="closeTextModal()"
        (contentAdded)="onContentAdded($event)">
      </app-add-text-content-modal>

      <app-add-image-modal
        [isOpen]="showImageModal"
        (close)="closeImageModal()"
        (contentAdded)="onContentAdded($event)">
      </app-add-image-modal>

      <app-add-media-modal
        [isOpen]="showMediaModal"
        (close)="closeMediaModal()"
        (contentAdded)="onContentAdded($event)">
      </app-add-media-modal>

      <app-approval-queue-modal
        [isOpen]="showApprovalModal"
        (close)="closeApprovalModal()"
        (itemApproved)="onItemApproved($event)"
        (itemRejected)="onItemRejected($event)">
      </app-approval-queue-modal>

      <!-- Content Source Viewer Modal (Shared Component) -->
      <app-content-source-view-modal
        [isOpen]="!!viewingContent"
        [contentSource]="viewingContent"
        (closed)="closeContentViewer()"
        (deleted)="onContentSourceDeleted($event)"
        (reprocessed)="onContentSourceReprocessed($event)">
      </app-content-source-view-modal>

      <!-- Processed Content Viewer Modal (Detailed - reuse from Lesson Builder) -->
      <div class="modal-overlay" *ngIf="viewingProcessedContent" (click)="closeProcessedContentViewer()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>🔍 Processed Content Details</h2>
            <button (click)="closeProcessedContentViewer()" class="close-btn">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="content-details">
              <h3>{{viewingProcessedContent.title || 'Untitled'}}</h3>
              <p class="content-type">Type: {{viewingProcessedContent.type}}</p>
              
              <div class="detail-section" *ngIf="viewingProcessedContent.description">
                <label>Description</label>
                <p>{{viewingProcessedContent.description}}</p>
              </div>

              <div class="detail-section" *ngIf="viewingProcessedContent.contentSource">
                <label>Source Content</label>
                <div class="source-info">
                  <span class="content-type-badge">{{viewingProcessedContent.contentSource.type}}</span>
                  <span>{{viewingProcessedContent.contentSource.title}}</span>
                  <a *ngIf="viewingProcessedContent.contentSource.sourceUrl" 
                     [href]="viewingProcessedContent.contentSource.sourceUrl" 
                     target="_blank" 
                     rel="noopener"
                     class="source-link">
                    View Source
                  </a>
                </div>
              </div>

              <div class="detail-section" *ngIf="viewingProcessedContent.videoId">
                <label>Video</label>
                <div class="video-info">
                  <p><strong>Channel:</strong> {{viewingProcessedContent.channel}}</p>
                  <p><strong>Duration:</strong> {{viewingProcessedContent.duration}}</p>
                  <p *ngIf="viewingProcessedContent.thumbnail">
                    <img [src]="viewingProcessedContent.thumbnail" alt="Video thumbnail" style="max-width: 200px; border-radius: 8px;">
                  </p>
                </div>
              </div>

              <div class="detail-section" *ngIf="viewingProcessedContent.transcript">
                <label>Transcript</label>
                <div class="transcript-box">
                  {{viewingProcessedContent.transcript}}
                </div>
              </div>

              <!-- Processed Content Data (for interaction types, not iframe-guide) -->
              <div class="detail-section" *ngIf="viewingProcessedContent.outputData && viewingProcessedContent.outputType !== 'iframe-guide'">
                <label>Generated Interaction Data</label>
                
                <!-- Ranked Suggestions (if available) -->
                <div *ngIf="viewingProcessedContent.outputData.rankedSuggestions && viewingProcessedContent.outputData.rankedSuggestions.length > 0" class="suggestions-container">
                  <p class="suggestions-intro">The LLM generated {{viewingProcessedContent.outputData.rankedSuggestions.length}} interaction suggestion(s) for this content:</p>
                  
                  <div *ngFor="let suggestion of viewingProcessedContent.outputData.rankedSuggestions; let i = index" class="suggestion-item">
                    <div class="suggestion-header" (click)="toggleSuggestion(i)">
                      <div class="suggestion-title">
                        <span class="suggestion-number">{{i + 1}}.</span>
                        <strong style="color: white;">{{suggestion.interactionType || suggestion.interactionId || 'Unknown Interaction'}}</strong>
                        <span class="confidence-badge" [class.high]="suggestion.confidence >= 0.8" [class.medium]="suggestion.confidence >= 0.5 && suggestion.confidence < 0.8" [class.low]="suggestion.confidence < 0.5">
                          Confidence: {{(suggestion.confidence * 100).toFixed(0)}}%
                        </span>
                      </div>
                      <span class="toggle-icon">{{expandedSuggestions.has(i) ? '▼' : '▶'}}</span>
                    </div>
                    
                    <div class="suggestion-content" *ngIf="expandedSuggestions.has(i)">
                      <!-- True/False Selection Data -->
                      <div *ngIf="suggestion.interactionId === 'true-false-selection' && suggestion.inputData?.fragments" class="interaction-data">
                        <h4>True/False Statements</h4>
                        <div class="fragments-list">
                          <div *ngFor="let fragment of suggestion.inputData.fragments" class="fragment-item" [class.true]="fragment.isTrueInContext" [class.false]="!fragment.isTrueInContext">
                            <div class="fragment-header">
                              <span class="fragment-badge" [class.true-badge]="fragment.isTrueInContext" [class.false-badge]="!fragment.isTrueInContext">
                                {{fragment.isTrueInContext ? 'TRUE' : 'FALSE'}}
                              </span>
                              <span class="fragment-text">{{fragment.text}}</span>
                            </div>
                            <p *ngIf="fragment.explanation" class="fragment-explanation">{{fragment.explanation}}</p>
                          </div>
                        </div>
                        <p *ngIf="suggestion.inputData.targetStatement" class="target-statement">
                          <strong>Target Statement:</strong> {{suggestion.inputData.targetStatement}}
                        </p>
                      </div>
                      
                      <!-- Fragment Builder Data -->
                      <div *ngIf="suggestion.interactionId === 'fragment-builder' && suggestion.inputData?.fragments" class="interaction-data">
                        <h4>Fragments</h4>
                        <div class="fragments-list">
                          <div *ngFor="let fragment of suggestion.inputData.fragments" class="fragment-item">
                            <div class="fragment-text">{{fragment.text}}</div>
                            <p *ngIf="fragment.explanation" class="fragment-explanation">{{fragment.explanation}}</p>
                          </div>
                        </div>
                        <p *ngIf="suggestion.inputData.targetStatement" class="target-statement">
                          <strong>Target Statement:</strong> {{suggestion.inputData.targetStatement}}
                        </p>
                      </div>
                      
                      <!-- Generic/Other Interaction Data -->
                      <div *ngIf="suggestion.inputData && !suggestion.inputData.fragments" class="interaction-data">
                        <h4>Input Data</h4>
                        <pre class="json-preview">{{suggestion.inputData | json}}</pre>
                      </div>
                      
                      <!-- View Full JSON Button -->
                      <button (click)="viewJsonData(suggestion)" class="btn-small btn-view-json">
                        📄 View Full JSON
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Direct output (if no rankedSuggestions) -->
                <div *ngIf="!viewingProcessedContent.outputData.rankedSuggestions" class="direct-output">
                  <p>Output Data:</p>
                  <pre class="json-preview">{{viewingProcessedContent.outputData | json}}</pre>
                  <button (click)="viewJsonData(viewingProcessedContent.outputData)" class="btn-small btn-view-json">
                    📄 View Full JSON
                  </button>
                </div>
              </div>
              
              <!-- iFrame Guide Content (simpler display) -->
              <div class="detail-section" *ngIf="viewingProcessedContent.outputData && viewingProcessedContent.outputType === 'iframe-guide'">
                <label>iFrame Guide Content</label>
                <div *ngIf="viewingProcessedContent.outputData.guidance" class="iframe-guide-content">
                  <div *ngIf="viewingProcessedContent.outputData.guidance.steps && viewingProcessedContent.outputData.guidance.steps.length > 0">
                    <h4>Steps:</h4>
                    <ol class="steps-list">
                      <li *ngFor="let step of viewingProcessedContent.outputData.guidance.steps">{{step}}</li>
                    </ol>
                  </div>
                  <div *ngIf="viewingProcessedContent.outputData.guidance.keyElements && viewingProcessedContent.outputData.guidance.keyElements.length > 0">
                    <h4>Key Elements:</h4>
                    <ul class="elements-list">
                      <li *ngFor="let element of viewingProcessedContent.outputData.guidance.keyElements">{{element}}</li>
                    </ul>
                  </div>
                  <p *ngIf="viewingProcessedContent.outputData.guidance.instructions">
                    <strong>Instructions:</strong> {{viewingProcessedContent.outputData.guidance.instructions}}
                  </p>
                  <div *ngIf="viewingProcessedContent.outputData.guidance.tips && viewingProcessedContent.outputData.guidance.tips.length > 0">
                    <h4>Tips:</h4>
                    <ul class="tips-list">
                      <li *ngFor="let tip of viewingProcessedContent.outputData.guidance.tips">{{tip}}</li>
                    </ul>
                  </div>
                </div>
                <div *ngIf="!viewingProcessedContent.outputData.guidance && viewingProcessedContent.outputData.message" class="no-guidance">
                  <p>{{viewingProcessedContent.outputData.message}}</p>
                </div>
              </div>

              <div class="detail-section" *ngIf="viewingProcessedContent.metadata">
                <label>Metadata</label>
                <pre class="metadata-box">{{viewingProcessedContent.metadata | json}}</pre>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button (click)="closeProcessedContentViewer()" class="btn-secondary">Close</button>
          </div>
        </div>
      </div>
      
      <!-- JSON Viewer Modal -->
      <div class="modal-overlay" *ngIf="viewingJsonData" (click)="closeJsonViewer()">
        <div class="modal-content json-viewer-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>📄 JSON Data</h2>
            <button (click)="closeJsonViewer()" class="close-btn">✕</button>
          </div>
          <div class="modal-body">
            <pre class="json-viewer">{{viewingJsonData | json}}</pre>
          </div>
          <div class="modal-footer">
            <button (click)="closeJsonViewer()" class="btn-secondary">Close</button>
          </div>
        </div>
      </div>
    </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: #141414;
      --padding-top: 64px;
    }
    @media (min-width: 768px) {
      ion-content {
        --padding-top: 80px;
      }
    }
    
    .content-library {
      padding: 20px;
      padding-bottom: 100px;
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 30px;
      position: relative;
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

    /* Tabs */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 2px solid rgba(255,255,255,0.1);
    }
    .tab-btn {
      padding: 12px 24px;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #9ca3af;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: -2px;
    }
    .tab-btn:hover {
      color: white;
      border-bottom-color: rgba(239,68,68,0.3);
    }
    .tab-btn.active {
      color: white;
      border-bottom-color: #ef4444;
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
    .lesson-usage {
      margin: 12px 0;
      padding: 10px;
      background: rgba(59,130,246,0.1);
      border-left: 3px solid rgba(59,130,246,0.5);
      border-radius: 4px;
    }
    .usage-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #60a5fa;
      margin-bottom: 8px;
    }
    .usage-label .icon {
      flex-shrink: 0;
    }
    .lesson-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .lesson-tag {
      background: rgba(59,130,246,0.2);
      color: #93c5fd;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
    }
    .more-tag {
      background: rgba(156,163,175,0.2);
      color: #9ca3af;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 500;
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
      max-width: 700px;
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
      padding: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    /* Add Menu Modal */
    .add-menu-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .add-menu-overlay {
        padding: 8px;
      }
    }

    .add-menu {
      background: #1f2937;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 450px;
      max-height: 90vh;
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      .add-menu {
        border-radius: 12px;
        max-width: 100%;
        max-height: calc(100vh - 16px);
        height: calc(100vh - 16px);
      }
    }

    .add-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }

    .add-menu-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: white;
    }

    .add-menu-header .close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .add-menu-header .close-btn:hover {
      color: white;
    }

    .add-menu-content {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    }

    .add-menu-section {
      margin-bottom: 12px;
    }

    .add-menu-section.separator {
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 16px;
      margin-top: 16px;
    }

    .add-menu-section h4 {
      margin: 0 0 12px 0;
      font-size: 11px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .menu-item-btn {
      width: 100%;
      padding: 12px 16px;
      margin-bottom: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      text-align: left;
      transition: all 0.2s;
      display: block;
    }

    .menu-item-btn:hover {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.3);
      transform: translateY(-1px);
    }

    .menu-item-btn:last-child {
      margin-bottom: 0;
    }

    /* Viewer Modals */
    .viewer-modal-brief {
      max-width: 500px;
    }

    @media (max-width: 768px) {
      .viewer-modal-brief {
        max-width: 100%;
      }
    }

    .viewer-section {
      margin-bottom: 20px;
    }

    .viewer-section label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .viewer-value {
      color: #d1d5db;
      font-size: 14px;
      line-height: 1.6;
    }

    .viewer-value a {
      color: #60a5fa;
      text-decoration: none;
      word-break: break-all;
    }

    .viewer-value a:hover {
      text-decoration: underline;
    }

    /* Processed Content Viewer */
    .content-details h3 {
      color: white;
      margin-bottom: 8px;
    }

    .content-details .content-type {
      color: #9ca3af;
      margin-bottom: 24px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .detail-section p {
      color: #d1d5db;
      line-height: 1.6;
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      color: #d1d5db;
    }

    .source-info .source-link {
      color: #60a5fa;
      text-decoration: none;
      font-size: 13px;
    }

    .source-info .source-link:hover {
      text-decoration: underline;
    }

    .video-info p {
      margin: 8px 0;
      color: #d1d5db;
    }

    .transcript-box, .metadata-box {
      background: rgba(0,0,0,0.3);
      padding: 16px;
      border-radius: 8px;
      max-height: 300px;
      overflow-y: auto;
      color: #d1d5db;
      font-size: 13px;
      line-height: 1.6;
    }

    .metadata-box {
      font-family: monospace;
      white-space: pre-wrap;
    }

    .source-link-section, .lesson-info {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 12px 0;
      padding: 8px 12px;
      background: rgba(59,130,246,0.1);
      border-left: 2px solid rgba(59,130,246,0.5);
      border-radius: 4px;
    }

    .source-link-section .link-icon,
    .lesson-info .icon {
      flex-shrink: 0;
      stroke: #60a5fa;
    }

    .source-link-section small,
    .lesson-info small {
      color: #93c5fd;
      font-size: 12px;
      font-weight: 500;
    }
    
    /* Processed Content Data Styles */
    .suggestions-container {
      margin-top: 16px;
    }
    .suggestions-intro {
      color: #9ca3af;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .suggestion-item {
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .suggestion-header {
      padding: 16px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background 0.2s;
    }
    .suggestion-header:hover {
      background: rgba(255,255,255,0.05);
    }
    .suggestion-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      flex-wrap: wrap;
    }
    .suggestion-title strong {
      color: white !important;
    }
    .suggestion-number {
      color: #ef4444;
      font-weight: bold;
      min-width: 24px;
    }
    .confidence-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .confidence-badge.high {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .confidence-badge.medium {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }
    .confidence-badge.low {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .toggle-icon {
      color: #9ca3af;
      font-size: 12px;
    }
    .suggestion-content {
      padding: 0 16px 16px 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      margin-top: 0;
    }
    .interaction-data {
      margin-top: 16px;
    }
    .interaction-data h4 {
      color: white;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .fragments-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .fragment-item {
      background: rgba(0,0,0,0.3);
      padding: 12px;
      border-radius: 6px;
      border-left: 3px solid #6b7280;
    }
    .fragment-item.true {
      border-left-color: #22c55e;
    }
    .fragment-item.false {
      border-left-color: #ef4444;
    }
    .fragment-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .fragment-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      min-width: 50px;
      text-align: center;
    }
    .fragment-badge.true-badge {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }
    .fragment-badge.false-badge {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .fragment-text {
      flex: 1;
      color: white;
      font-size: 14px;
    }
    .fragment-explanation {
      color: #9ca3af;
      font-size: 12px;
      margin-top: 8px;
      font-style: italic;
    }
    .target-statement {
      margin-top: 16px;
      padding: 12px;
      background: rgba(59, 130, 246, 0.1);
      border-radius: 6px;
      color: #93c5fd;
      font-size: 14px;
    }
    .json-preview {
      background: rgba(0,0,0,0.3);
      padding: 12px;
      border-radius: 6px;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #d1d5db;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .btn-view-json {
      margin-top: 12px;
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .btn-view-json:hover {
      background: rgba(59, 130, 246, 0.3);
    }
    .direct-output {
      margin-top: 12px;
    }
    .direct-output p {
      color: #9ca3af;
      margin-bottom: 8px;
    }
    
    /* iFrame Guide Styles */
    .iframe-guide-content h4 {
      color: white;
      margin-top: 16px;
      margin-bottom: 8px;
      font-size: 16px;
    }
    .iframe-guide-content h4:first-child {
      margin-top: 0;
    }
    .steps-list, .elements-list, .tips-list {
      color: #d1d5db;
      padding-left: 24px;
      margin: 8px 0;
    }
    .steps-list li, .elements-list li, .tips-list li {
      margin-bottom: 6px;
    }
    .no-guidance {
      color: #9ca3af;
      font-style: italic;
      padding: 12px;
      background: rgba(0,0,0,0.2);
      border-radius: 6px;
    }
    
    /* JSON Viewer Modal */
    .json-viewer-modal {
      max-width: 90%;
      max-height: 90vh;
    }
    .json-viewer {
      background: rgba(0,0,0,0.5);
      padding: 20px;
      border-radius: 8px;
      max-height: 70vh;
      overflow-y: auto;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #d1d5db;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class ContentLibraryComponent implements OnInit, OnDestroy {
  contentSources: ContentSource[] = [];
  searchResults: SearchResult[] = [];
  searchQuery = '';
  filterType = '';
  filterStatus = '';
  loading = false;
  pendingCount = 0;
  activeTab: 'sources' | 'processed' = 'sources';

  // Processed content
  processedContentItems: ProcessedContentItem[] = [];
  viewingProcessedContent: ProcessedContentItem | null = null;
  viewingJsonData: any = null; // For JSON viewer modal
  expandedSuggestions: Set<number> = new Set(); // Track which suggestions are expanded
  lessonTitles: Map<string, string> = new Map();
  
  // Content source lessons mapping
  contentSourceLessons: Map<string, Array<{ id: string; title: string }>> = new Map();

  // Modal states
  showAddMenu = false;
  showUrlModal = false;
  showPdfModal = false;
  showTextModal = false;
  showImageModal = false;
  showMediaModal = false;
  showApprovalModal = false;
  viewingContent: ContentSource | null = null;

  constructor(
    private contentSourceService: ContentSourceService,
    private processedContentService: ProcessedContentService,
    private toastService: ToastService,
    private http: HttpClient,
    private router: Router
  ) {}

  async ngOnInit() {
    console.log('[ContentLibrary] 🚀 Component initialized with ion-content');
    
    // Reset header display
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
    
    await this.loadContent();
    await this.loadPendingCount();
    await this.loadProcessedContent(); // Load processed content on init so count shows correctly
  }

  ngOnDestroy() {
    // Always reset body overflow and header when leaving page
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
  }

  async loadContent() {
    console.log('[ContentLibrary] 🔄 Loading content sources...');
    this.loading = true;
    try {
      await this.contentSourceService.loadContentSources(this.filterStatus);
      this.contentSourceService.contentSources$.subscribe(async sources => {
        console.log('[ContentLibrary] 📊 Received sources:', sources);
        console.log('[ContentLibrary] 📊 Count:', sources.length);
        this.contentSources = sources;
        // Load lessons for each content source
        await this.loadLessonsForContentSources();
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

  async loadLessonsForContentSources() {
    for (const source of this.contentSources) {
      try {
        const response: any = await this.http.get(
          `${environment.apiUrl}/content-sources/${source.id}/lessons`
        ).toPromise();
        this.contentSourceLessons.set(source.id, response.lessons || []);
      } catch (error) {
        console.error(`[ContentLibrary] Failed to load lessons for content source ${source.id}:`, error);
        this.contentSourceLessons.set(source.id, []);
      }
    }
  }

  getLessonsForContentSource(contentSourceId: string): Array<{ id: string; title: string }> {
    return this.contentSourceLessons.get(contentSourceId) || [];
  }

  onSearchChange(query: string) {
    // Filtering is now done by getFilteredContentSources() and getFilteredProcessedContent()
    // No need for additional search API call
  }

  clearSearch() {
    this.searchQuery = '';
  }

  async applyFilters() {
    await this.loadContent();
  }

  // Add Menu Methods
  toggleAddMenu() {
    this.showAddMenu = !this.showAddMenu;
    // Lock/unlock body scroll and hide/show header
    if (this.showAddMenu) {
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

  closeAddMenu() {
    this.showAddMenu = false;
    // Unlock body scroll and show header
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
  }

  // Modal open methods
  openUrlModal() {
    this.closeAddMenu();
    this.showUrlModal = true;
  }

  openPdfModal() {
    this.closeAddMenu();
    this.showPdfModal = true;
  }

  openTextModal() {
    this.closeAddMenu();
    this.showTextModal = true;
  }

  openImageModal() {
    this.closeAddMenu();
    this.showImageModal = true;
  }

  openMediaModal() {
    this.closeAddMenu();
    this.showMediaModal = true;
  }

  openApprovalModal() {
    this.closeAddMenu();
    this.showApprovalModal = true;
  }

  // Modal close methods
  closeUrlModal() {
    this.showUrlModal = false;
  }

  closePdfModal() {
    this.showPdfModal = false;
  }

  closeTextModal() {
    this.showTextModal = false;
  }

  closeImageModal() {
    this.showImageModal = false;
  }

  closeMediaModal() {
    this.showMediaModal = false;
  }

  closeApprovalModal() {
    this.showApprovalModal = false;
  }

  // Content event handlers
  async onContentProcessed(data: any) {
    console.log('[ContentLibrary] Content processed:', data);
    await this.loadContent();
    await this.loadPendingCount();
  }

  async onContentSubmitted(data: any) {
    console.log('[ContentLibrary] Content submitted for approval:', data);
    await this.loadContent();
    await this.loadPendingCount();
  }

  async onContentAdded(contentData: any) {
    console.log('[ContentLibrary] 📥 Adding content:', contentData);
    try {
      // Check if content source already exists (from media upload endpoint)
      if (contentData.id && contentData.type === 'media') {
        // Media upload endpoint already created the content source
        console.log('[ContentLibrary] ✅ Content source already created by upload endpoint:', contentData.id);
        
        // Show success toast
        this.toastService.success(
          `✓ Media file "${contentData.title || 'uploaded'}" uploaded successfully! Pending approval.`,
          4000
        );
        
        await this.loadContent();
        await this.loadPendingCount();
      } else {
        // For other content types, create via API
        const created = await this.contentSourceService.createContentSource(contentData);
        console.log('[ContentLibrary] ✅ Content source created:', created);
        
        // Show success toast
        this.toastService.success(
          `✓ Content source "${created.title}" added successfully! Pending approval.`,
          4000
        );
        
        await this.loadContent();
        await this.loadPendingCount();
      }
    } catch (error: any) {
      console.error('[ContentLibrary] ❌ Failed to create content:', error);
      console.error('[ContentLibrary] Error details:', {
        message: error?.message,
        status: error?.status,
        error: error?.error
      });
      
      this.toastService.error(
        `Failed to add content: ${error?.message || 'Unknown error'}`,
        5000
      );
    }
  }

  onItemApproved(item: any) {
    console.log('[ContentLibrary] Item approved:', item);
    this.loadContent();
    this.loadPendingCount();
  }

  onItemRejected(item: any) {
    console.log('[ContentLibrary] Item rejected:', item);
    this.loadContent();
    this.loadPendingCount();
  }

  viewContent(source: ContentSource | undefined) {
    if (!source) return;
    console.log('[ContentLibrary] Viewing content:', source);
    this.viewingContent = source;
    // Lock body scroll and hide header when modal opens
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = 'none';
    }
  }

  closeContentViewer() {
    this.viewingContent = null;
    // Unlock body scroll and show header when modal closes
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
  }

  editContent(source: ContentSource) {
    console.log('Editing content:', source);
    // TODO: Open edit modal
  }

  async onContentSourceDeleted(contentSourceId: string) {
    console.log('[ContentLibrary] Content source deleted:', contentSourceId);
    this.toastService.success('Content source deleted successfully', 3000);
    await this.loadContent();
    this.closeContentViewer();
  }

  async onContentSourceReprocessed(contentSourceId: string) {
    console.log('[ContentLibrary] Content source reprocessed:', contentSourceId);
    this.toastService.success('Content source reprocessed successfully - status set to pending', 3000);
    // Reload content to get updated status
    await this.loadContent();
    // If we're viewing this content source, refresh it
    if (this.viewingContent?.id === contentSourceId) {
      const updated = await this.contentSourceService.getContentSource(contentSourceId);
      if (updated) {
        this.viewingContent = updated;
        console.log('[ContentLibrary] ✅ Refreshed viewing content, new status:', updated.status);
      }
    }
  }

  // Processed Content Methods
  async loadProcessedContent() {
    try {
      console.log('[ContentLibrary] 📥 Loading all processed content...');
      // Load all processed content (not filtered by lesson)
      const response = await this.http.get<any[]>(
        `${environment.apiUrl}/lesson-editor/processed-outputs/all`,
        {
          headers: {
            'x-tenant-id': environment.tenantId,
            'x-user-id': environment.defaultUserId
          }
        }
      ).toPromise();
      
      const responseData: any[] = response || [];
      
      // Map backend ProcessedContentOutput to frontend ProcessedContentItem
      // Backend has 'outputName', frontend expects 'title'
      this.processedContentItems = responseData.map((item: any) => ({
        ...item,
        title: item.title || item.outputName || 'Processed Content', // Use outputName as fallback for title
        type: item.outputType || item.type || 'processed',
        description: item.description || 'No description available',
        status: 'ready' as const,
        createdAt: item.createdAt || new Date().toISOString(),
        lessonId: item.lessonId || DEFAULT_LESSON_ID,
        contentSourceId: item.contentSourceId,
        outputData: item.outputData, // Include the processed output data
        outputType: item.outputType, // Include the output type
        contentSource: item.contentSource ? {
          id: item.contentSource.id,
          title: item.contentSource.title,
          type: item.contentSource.type,
          sourceUrl: item.contentSource.sourceUrl,
          summary: item.contentSource.summary,
          fullText: item.contentSource.fullText,
          metadata: item.contentSource.metadata,
        } : undefined,
      }));
      
      console.log('[ContentLibrary] ✅ Loaded processed content:', this.processedContentItems.length);
      console.log('[ContentLibrary] 📋 Sample item:', this.processedContentItems[0] ? {
        id: this.processedContentItems[0].id,
        title: this.processedContentItems[0].title,
        outputName: responseData[0]?.outputName,
      } : 'No items');
      
      // Load lesson titles for display
      await this.loadLessonTitles();
    } catch (error) {
      console.error('[ContentLibrary] ❌ Failed to load processed content:', error);
      this.processedContentItems = [];
    }
  }

  async loadLessonTitles() {
    const lessonIds = [
      ...new Set(
        this.processedContentItems
          .map(item => item.lessonId)
          .filter(id => id && !isDefaultLessonId(id)),
      ),
    ];

    for (const lessonId of lessonIds) {
      try {
        const lesson = await this.http
          .get<any>(`${environment.apiUrl}/lessons/${lessonId}`)
          .toPromise();
        this.lessonTitles.set(lessonId, lesson.title);
      } catch (error) {
        console.error(`Failed to load lesson ${lessonId}:`, error);
        this.lessonTitles.set(lessonId, 'Unknown Lesson');
      }
    }
  }

  getLessonTitle(lessonId: string): string {
    if (isDefaultLessonId(lessonId)) {
      return 'Not linked to a lesson';
    }
    return this.lessonTitles.get(lessonId) || 'Loading...';
  }

  viewProcessedContent(item: ProcessedContentItem) {
    console.log('[ContentLibrary] 🔍 Viewing processed content:', item);
    this.viewingProcessedContent = item;
    // Lock body scroll and hide header when modal opens
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = 'none';
    }
  }

  closeProcessedContentViewer() {
    this.viewingProcessedContent = null;
    this.expandedSuggestions.clear(); // Reset expanded suggestions
    // Unlock body scroll and show header when modal closes
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
  }
  
  toggleSuggestion(index: number) {
    if (this.expandedSuggestions.has(index)) {
      this.expandedSuggestions.delete(index);
    } else {
      this.expandedSuggestions.add(index);
    }
  }
  
  viewJsonData(data: any) {
    this.viewingJsonData = data;
    // Body scroll is already locked by processed content modal, so we don't need to lock again
  }
  
  closeJsonViewer() {
    this.viewingJsonData = null;
    // Body scroll will remain locked by processed content modal if it's still open
  }

  async deleteProcessedContent(id: string) {
    const warningMessage = '⚠️ WARNING: Deleting this processed content will set the associated content source status to PENDING.\n\n' +
      'The content source will need to be re-approved to trigger re-processing.\n\n' +
      'Are you sure you want to delete this processed content?';
    
    if (!confirm(warningMessage)) return;

    try {
      const result: any = await this.http.delete(`${environment.apiUrl}/lesson-editor/processed-outputs/${id}`).toPromise();
      console.log('[ContentLibrary] ✅ Deleted processed content:', result);
      
      if (result?.contentSourceId) {
        this.toastService.success('Processed content deleted. Content source set to pending - re-approval required for re-processing.', 5000);
        // Reload content sources to reflect status change
        await this.loadContent();
      } else {
        this.toastService.success('Processed content deleted successfully', 3000);
      }
      
      await this.loadProcessedContent();
    } catch (error) {
      console.error('[ContentLibrary] ❌ Failed to delete:', error);
      alert('Failed to delete processed content');
    }
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

  // Filter methods for tabs
  getFilteredContentSources(): ContentSource[] {
    let filtered = this.contentSources;

    // Apply search filter
    if (this.searchQuery && this.searchQuery.trim().length >= 2) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(source => {
        const titleMatch = source.title?.toLowerCase().includes(query);
        const summaryMatch = source.summary?.toLowerCase().includes(query);
        const topicMatch = source.metadata?.topics?.some((topic: string) => 
          topic.toLowerCase().includes(query)
        );
        return titleMatch || summaryMatch || topicMatch;
      });
    }

    return filtered;
  }

  getFilteredProcessedContent(): ProcessedContentItem[] {
    let filtered = this.processedContentItems;

    // Apply search filter
    if (this.searchQuery && this.searchQuery.trim().length >= 2) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const descMatch = item.description?.toLowerCase().includes(query);
        const typeMatch = item.type?.toLowerCase().includes(query);
        const sourceMatch = item.contentSource?.title?.toLowerCase().includes(query);
        return titleMatch || descMatch || typeMatch || sourceMatch;
      });
    }

    return filtered;
  }
}

