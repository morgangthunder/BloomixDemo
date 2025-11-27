import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { environment } from '../../../environments/environment';
import { ContentSourceService } from '../../core/services/content-source.service';
import { ContentSource } from '../../core/models/content-source.model';
import { ContentSourceViewModalComponent } from '../../shared/components/content-source-view-modal/content-source-view-modal.component';

interface DraftChange {
  category: string;
  type: string;
  field: string;
  from: any;
  to: any;
  description?: string;
  context?: string;
  fileUrl?: string;
  configKey?: string;
}

interface PendingDraft {
  id: string;
  lessonId: string;
  lessonTitle: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  changesCount: number;
  changeSummary: string;
  changeCategories?: string[];
}

interface DraftDiff {
  draftId: string;
  lessonId: string;
  lessonTitle: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  changes: DraftChange[];
  changesCount: number;
  changeCategories?: string[];
}

interface ChangeGroup {
  category: string;
  label: string;
  changes: DraftChange[];
  expanded: boolean;
}

@Component({
  selector: 'app-approval-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, ContentSourceViewModalComponent],
  template: `
    <ion-content>
      <div class="approval-queue-page">
        <!-- Header -->
        <div class="page-header">
          <button (click)="goBack()" class="back-button">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          </button>
          <div>
            <h1>Approval Queue</h1>
            <p class="subtitle">Review and approve pending items</p>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs-container">
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'lessons'"
            (click)="activeTab = 'lessons'">
            📝 Lesson Approvals ({{pendingDrafts.length}})
          </button>
          <button 
            class="tab-button" 
            [class.active]="activeTab === 'content'"
            (click)="activeTab = 'content'; loadPendingContent()">
            📚 Content Approvals ({{pendingContent.length}})
          </button>
        </div>

        <!-- Lesson Approvals Tab -->
        <div *ngIf="activeTab === 'lessons'" class="tab-content">
          <!-- Loading State -->
          <div *ngIf="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading pending drafts...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && pendingDrafts.length === 0" class="empty-state">
            <div class="empty-icon">✅</div>
            <h2>No Pending Drafts</h2>
            <p>All lesson changes have been reviewed!</p>
          </div>

          <!-- Drafts List -->
          <div *ngIf="!loading && pendingDrafts.length > 0" class="drafts-list">
          <div *ngFor="let draft of pendingDrafts" class="draft-card">
            <div class="draft-header">
              <div class="draft-info">
                <h3>{{draft.lessonTitle}}</h3>
                <p class="draft-meta">
                  <span>{{draft.changesCount}} change{{draft.changesCount === 1 ? '' : 's'}}</span>
                  <span *ngIf="draft.changeCategories && draft.changeCategories.length > 0">
                    • {{draft.changeCategories.length}} type{{draft.changeCategories.length === 1 ? '' : 's'}}
                  </span>
                  <span>•</span>
                  <span>Updated {{formatDate(draft.updatedAt)}}</span>
                </p>
              </div>
              <div class="draft-actions">
                <button class="btn-view" (click)="viewChanges(draft)">
                  👁️ View Changes
                </button>
                <button class="btn-approve" (click)="approveDraft(draft)">
                  ✅ Approve All
                </button>
                <button class="btn-reject" (click)="rejectDraft(draft)">
                  ❌ Reject All
                </button>
              </div>
            </div>
            <div class="draft-summary" *ngIf="draft.changeSummary">
              {{draft.changeSummary}}
            </div>
          </div>
        </div>
        </div>

        <!-- Content Approvals Tab -->
        <div *ngIf="activeTab === 'content'" class="tab-content">
          <!-- Loading State -->
          <div *ngIf="loadingContent" class="loading-state">
            <div class="spinner"></div>
            <p>Loading pending content...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loadingContent && pendingContent.length === 0" class="empty-state">
            <div class="empty-icon">✅</div>
            <h2>No Pending Content</h2>
            <p>All content sources have been reviewed!</p>
          </div>

          <!-- Content List -->
          <div *ngIf="!loadingContent && pendingContent.length > 0" class="content-list">
            <div *ngFor="let source of pendingContent" class="content-card" [class.expanded]="expandedContent[source.id]">
              <!-- Brief View (Collapsed) -->
              <div class="content-card-brief" (click)="toggleContentExpand(source.id)">
                <div class="content-brief-info">
                  <span class="content-type-badge">{{source.type}}</span>
                  <h3>{{source.title || 'Untitled'}}</h3>
                  <span class="content-status-badge pending">Pending</span>
                </div>
                <div class="expand-icon">{{expandedContent[source.id] ? '▼' : '▶'}}</div>
              </div>

              <!-- Expanded View -->
              <div *ngIf="expandedContent[source.id]" class="content-card-expanded">
                <div class="content-body">
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
                <div class="content-actions">
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
                    <button 
                      (click)="approveContent(source.id)" 
                      class="btn-approve" 
                      [disabled]="processingContent">
                      {{processingContent ? 'Processing...' : '✓ Approve'}}
                    </button>
                    <button 
                      (click)="startReject(source.id)" 
                      class="btn-reject" 
                      [disabled]="processingContent">
                      ✕ Reject
                    </button>
                    <button (click)="viewContentSource(source)" class="btn-view">
                      👁️ View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Source View Modal -->
        <app-content-source-view-modal
          [isOpen]="!!viewingContentSource"
          [contentSource]="viewingContentSource"
          (closed)="closeContentViewModal()"
          (deleted)="onContentSourceDeleted($event)"
          (reprocessed)="onContentSourceReprocessed($event)">
        </app-content-source-view-modal>

        <!-- Changes Modal -->
        <div *ngIf="selectedDraft && showChangesModal && selectedDraftDiff && selectedDraftDiff.changesCount > 0" class="modal-overlay" (click)="closeChangesModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Changes for: {{selectedDraftDiff?.lessonTitle}}</h2>
              <button (click)="closeChangesModal()" class="close-button">✕</button>
            </div>
            
            <div class="modal-body" *ngIf="selectedDraftDiff">
              <div *ngIf="loadingDiff" class="loading-diff">
                <div class="spinner"></div>
                <p>Loading changes...</p>
              </div>

              <div *ngIf="!loadingDiff && selectedDraftDiff && selectedDraftDiff.changesCount > 0 && selectedDraftDiff.changes.length > 0" class="changes-list">
                <!-- Grouped by category -->
                <div *ngFor="let group of changeGroups" class="change-group">
                  <div class="change-group-header" (click)="toggleGroup(group)">
                    <div class="group-title">
                      <span class="expand-icon">{{group.expanded ? '▼' : '▶'}}</span>
                      <span class="group-label">{{group.label}}</span>
                      <span class="group-count">({{group.changes.length}})</span>
                    </div>
                    <div class="group-actions" (click)="$event.stopPropagation()">
                      <button class="btn-view-small" (click)="viewGroupChanges(group)">
                        👁️ View
                      </button>
                      <button class="btn-approve-small" (click)="approveGroup(group)">
                        ✅ Approve
                      </button>
                      <button class="btn-reject-small" (click)="rejectGroup(group)">
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                  <div *ngIf="group.expanded" class="change-group-content">
                    <div *ngFor="let change of group.changes" class="change-item">
                      <div class="change-header">
                        <span class="change-type-badge" [class]="'badge-' + change.category">
                          {{getChangeCategoryLabel(change.category)}}
                        </span>
                        <span class="change-field">{{change.field}}</span>
                      </div>
                      <div class="change-description" *ngIf="change.description">
                        {{change.description}}
                      </div>
                      <div class="change-content">
                        <div class="change-from" *ngIf="change.from !== null && change.from !== undefined">
                          <div class="label">Before:</div>
                          <div class="value">{{formatChangeValue(change.from)}}</div>
                        </div>
                        <div class="change-arrow" *ngIf="change.from !== null && change.from !== undefined">→</div>
                        <div class="change-to">
                          <div class="label">{{change.from !== null && change.from !== undefined ? 'After' : 'New'}}:</div>
                          <div class="value">
                            {{formatChangeValue(change.to)}}
                            <a *ngIf="change.fileUrl" [href]="change.fileUrl" target="_blank" class="file-link">
                              📄 View File
                            </a>
                          </div>
                        </div>
                      </div>
                      <div class="change-context" *ngIf="change.context">
                        <small>{{change.context}}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeChangesModal()">Close</button>
              <button class="btn-reject" (click)="rejectDraft(selectedDraft)">❌ Reject</button>
              <button class="btn-approve" (click)="approveDraft(selectedDraft)">✅ Approve</button>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .approval-queue-page {
      min-height: 100vh;
      background: #0a0a0a;
      color: white;
      padding: 80px 20px 20px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
    }

    .back-button {
      background: none;
      border: none;
      color: #00d4ff;
      cursor: pointer;
      padding: 8px;
      display: flex;
      align-items: center;
      transition: opacity 0.2s;
    }

    .back-button:hover {
      opacity: 0.7;
    }

    .page-header h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
    }

    .subtitle {
      color: rgba(255, 255, 255, 0.6);
      margin: 4px 0 0 0;
    }

    .loading-state,
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .drafts-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .draft-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s;
    }

    .draft-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .draft-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
    }

    .draft-info h3 {
      margin: 0 0 8px 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .draft-meta {
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
      margin: 0;
      display: flex;
      gap: 8px;
    }

    .draft-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn-view,
    .btn-approve,
    .btn-reject,
    .btn-secondary {
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-view {
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .btn-view:hover {
      background: rgba(0, 212, 255, 0.2);
    }

    .btn-approve {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .btn-approve:hover {
      background: rgba(34, 197, 94, 0.2);
    }

    .btn-reject {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-reject:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .draft-summary {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.875rem;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    }

    .modal-content {
      background: #1a1a1a;
      border-radius: 16px;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .close-button {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s;
    }

    .close-button:hover {
      color: white;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .loading-diff {
      text-align: center;
      padding: 40px;
    }

    .no-changes {
      text-align: center;
      padding: 40px;
      color: rgba(255, 255, 255, 0.6);
    }

    .changes-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .change-item {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 16px;
    }

    .change-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .change-type-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-title,
    .badge-description {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }

    .badge-script_text,
    .badge-script_added {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
    }

    .badge-interaction_type {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .change-field {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .change-content {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .change-from,
    .change-to {
      flex: 1;
    }

    .change-from .label,
    .change-to .label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      margin-bottom: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .change-from .value {
      color: rgba(239, 68, 68, 0.8);
      background: rgba(239, 68, 68, 0.1);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 0.875rem;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .change-to .value {
      color: rgba(34, 197, 94, 0.8);
      background: rgba(34, 197, 94, 0.1);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 0.875rem;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .change-arrow {
      color: rgba(255, 255, 255, 0.4);
      font-size: 1.5rem;
      padding-top: 20px;
    }

    .change-context {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.75rem;
    }

    .change-group {
      margin-bottom: 20px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .change-group-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: background 0.2s;
    }

    .change-group-header:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .group-title {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .expand-icon {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
      width: 16px;
    }

    .group-label {
      font-weight: 600;
      font-size: 1rem;
      color: #fff;
    }

    .group-count {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.875rem;
    }

    .group-actions {
      display: flex;
      gap: 8px;
    }

    .btn-view-small,
    .btn-approve-small,
    .btn-reject-small {
      padding: 6px 12px;
      border-radius: 4px;
      border: none;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-view-small {
      background: rgba(0, 212, 255, 0.1);
      color: #00d4ff;
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .btn-view-small:hover {
      background: rgba(0, 212, 255, 0.2);
    }

    .btn-approve-small {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .btn-approve-small:hover {
      background: rgba(34, 197, 94, 0.2);
    }

    .btn-reject-small {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-reject-small:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .change-group-content {
      padding: 16px;
    }

    .change-description {
      margin-bottom: 12px;
      padding: 8px 12px;
      background: rgba(0, 212, 255, 0.05);
      border-left: 3px solid #00d4ff;
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.875rem;
    }

    .file-link {
      display: inline-block;
      margin-left: 8px;
      color: #00d4ff;
      text-decoration: none;
      font-size: 0.875rem;
    }

    .file-link:hover {
      text-decoration: underline;
    }

    .badge-new_lesson {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .badge-metadata {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }

    .badge-structure {
      background: rgba(168, 85, 247, 0.2);
      color: #a78bfa;
    }

    .badge-script {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
    }

    .badge-interaction {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
    }

    .badge-interaction_config {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .badge-content_submission {
      background: rgba(236, 72, 153, 0.2);
      color: #ec4899;
    }

    .badge-other {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    /* Tabs */
    .tabs-container {
      display: flex;
      gap: 12px;
      margin-bottom: 30px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }

    .tab-button {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
      position: relative;
      top: 2px;
    }

    .tab-button:hover {
      color: rgba(255, 255, 255, 0.9);
    }

    .tab-button.active {
      color: #00d4ff;
      border-bottom-color: #00d4ff;
    }

    .tab-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Content Approvals Styles */
    .content-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .content-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s;
    }

    .content-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .content-card-brief {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .content-card-brief:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .content-brief-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .content-type-badge {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .content-brief-info h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      flex: 1;
    }

    .content-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .content-status-badge.pending {
      background: rgba(251, 191, 36, 0.2);
      color: #fbbf24;
    }

    .content-card-expanded {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 20px;
      background: rgba(0, 0, 0, 0.2);
    }

    .content-body {
      margin-bottom: 20px;
    }

    .content-body .field {
      margin-bottom: 16px;
    }

    .content-body .field label {
      display: block;
      color: #9ca3af;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
    }

    .content-body .field p, .content-body .field span {
      color: #d1d5db;
      line-height: 1.6;
    }

    .content-body .field a {
      color: #60a5fa;
      text-decoration: none;
      word-break: break-all;
    }

    .content-body .field a:hover {
      text-decoration: underline;
    }

    .topics, .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .topic-tag {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
    }

    .keyword-tag {
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
    }

    .content-actions {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 20px;
    }

    .rejection-section {
      margin-bottom: 16px;
    }

    .rejection-input {
      width: 100%;
      padding: 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(239, 68, 68, 0.3);
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

    @media (max-width: 768px) {
      .draft-header {
        flex-direction: column;
      }

      .draft-actions {
        width: 100%;
      }

      .draft-actions button {
        flex: 1;
      }

      .change-content {
        flex-direction: column;
      }

      .change-arrow {
        transform: rotate(90deg);
        padding: 8px 0;
      }

      .tabs-container {
        flex-direction: column;
        border-bottom: none;
      }

      .tab-button {
        border-bottom: none;
        border-left: 3px solid transparent;
        top: 0;
      }

      .tab-button.active {
        border-left-color: #00d4ff;
        border-bottom-color: transparent;
      }
    }
  `]
})
export class ApprovalQueueComponent implements OnInit, AfterViewInit {
  activeTab: 'lessons' | 'content' = 'lessons';
  pendingDrafts: PendingDraft[] = [];
  loading = true;
  showChangesModal = false;
  selectedDraft: PendingDraft | null = null;
  selectedDraftDiff: DraftDiff | null = null;
  loadingDiff = false;
  changeGroups: ChangeGroup[] = [];
  
  // Content approvals
  pendingContent: ContentSource[] = [];
  loadingContent = false;
  processingContent = false;
  showRejectForm: string | null = null;
  rejectionReason = '';
  expandedContent: { [key: string]: boolean } = {};
  viewingContentSource: ContentSource | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private contentSourceService: ContentSourceService
  ) {}

  ngOnInit() {
    // Always refresh when component loads to get latest data
    this.loadPendingDrafts();
    this.loadPendingContent(); // Load content approvals on init so count shows correctly
  }

  ngAfterViewInit() {
    // Also refresh after view init to catch any drafts that were just created
    setTimeout(() => {
      this.loadPendingDrafts();
    }, 500);
  }

  loadPendingDrafts() {
    this.loading = true;
    this.http.get<PendingDraft[]>(`${environment.apiUrl}/lesson-drafts/pending`, {
      headers: {
        'x-tenant-id': environment.tenantId
      }
    }).subscribe({
      next: (drafts) => {
        // Filter out drafts with 0 changes - they shouldn't appear in the queue
        this.pendingDrafts = (drafts || []).filter((draft: PendingDraft) => 
          draft.changesCount && draft.changesCount > 0
        );
        this.loading = false;
        console.log('[ApprovalQueue] Loaded drafts:', this.pendingDrafts);
      },
      error: (err) => {
        console.error('[ApprovalQueue] Failed to load drafts:', err);
        this.loading = false;
      }
    });
  }

  viewChanges(draft: PendingDraft) {
    // Don't show modal if there are no changes
    if (draft.changesCount === 0 || !draft.changesCount) {
      console.log('[ApprovalQueue] Draft has no changes, not showing modal');
      return;
    }

    this.selectedDraft = draft;
    this.showChangesModal = true;
    this.loadingDiff = true;
    this.changeGroups = [];

    // Load diff
    this.http.get<DraftDiff>(`${environment.apiUrl}/lesson-drafts/${draft.id}/diff`).subscribe({
      next: (diff) => {
        this.selectedDraftDiff = diff;
        this.loadingDiff = false;
        
        // If diff shows no changes, close the modal
        if (diff.changesCount === 0 || (diff.changes && diff.changes.length === 0)) {
          console.log('[ApprovalQueue] Diff shows no changes, closing modal');
          this.closeChangesModal();
          return;
        }
        
        this.groupChangesByCategory(diff.changes);
        console.log('[ApprovalQueue] Loaded diff:', diff);
      },
      error: (err) => {
        console.error('[ApprovalQueue] Failed to load diff:', err);
        this.loadingDiff = false;
        this.closeChangesModal();
      }
    });
  }

  groupChangesByCategory(changes: DraftChange[]) {
    const groupsMap = new Map<string, DraftChange[]>();
    
    changes.forEach(change => {
      const category = change.category || 'other';
      if (!groupsMap.has(category)) {
        groupsMap.set(category, []);
      }
      groupsMap.get(category)!.push(change);
    });

    this.changeGroups = Array.from(groupsMap.entries()).map(([category, changes]) => ({
      category,
      label: this.getChangeCategoryLabel(category),
      changes,
      expanded: true // Expand all by default
    }));
  }

  toggleGroup(group: ChangeGroup) {
    group.expanded = !group.expanded;
  }

  viewGroupChanges(group: ChangeGroup) {
    // Toggle collapse/expand for the group
    this.toggleGroup(group);
  }

  approveGroup(group: ChangeGroup) {
    if (!confirm(`Approve all ${group.changes.length} ${group.label.toLowerCase()} changes?`)) {
      return;
    }
    // For now, approve the entire draft
    // In the future, we could implement partial approval
    if (this.selectedDraft) {
      this.approveDraft(this.selectedDraft);
    }
  }

  rejectGroup(group: ChangeGroup) {
    if (!confirm(`Reject all ${group.changes.length} ${group.label.toLowerCase()} changes?`)) {
      return;
    }
    // For now, reject the entire draft
    // In the future, we could implement partial rejection
    if (this.selectedDraft) {
      this.rejectDraft(this.selectedDraft);
    }
  }

  formatChangeValue(value: any): string {
    if (value === null || value === undefined) {
      return '(blank)';
    }
    if (typeof value === 'string') {
      return value || '(blank)';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  closeChangesModal() {
    this.showChangesModal = false;
    this.selectedDraft = null;
    this.selectedDraftDiff = null;
  }

  approveDraft(draft: PendingDraft) {
    if (!confirm(`Approve changes to "${draft.lessonTitle}"? This will make the changes live.`)) {
      return;
    }

    this.http.post(`${environment.apiUrl}/lesson-drafts/${draft.id}/approve`, {}, {
      headers: {
        'x-user-id': environment.defaultUserId
      }
    }).subscribe({
      next: () => {
        console.log('[ApprovalQueue] Draft approved');
        this.showChangesModal = false;
        this.loadPendingDrafts(); // Reload list
        alert('Draft approved successfully! Changes are now live.');
      },
      error: (err) => {
        console.error('[ApprovalQueue] Failed to approve:', err);
        alert('Failed to approve draft');
      }
    });
  }

  rejectDraft(draft: PendingDraft) {
    if (!confirm(`Reject changes to "${draft.lessonTitle}"? The draft will be marked as rejected.`)) {
      return;
    }

    this.http.post(`${environment.apiUrl}/lesson-drafts/${draft.id}/reject`, {}, {
      headers: {
        'x-user-id': environment.defaultUserId
      }
    }).subscribe({
      next: () => {
        console.log('[ApprovalQueue] Draft rejected');
        this.showChangesModal = false;
        this.loadPendingDrafts(); // Reload list
        alert('Draft rejected');
      },
      error: (err) => {
        console.error('[ApprovalQueue] Failed to reject:', err);
        alert('Failed to reject draft');
      }
    });
  }

  getChangeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'title': 'Title',
      'description': 'Description',
      'script_text': 'Script Text',
      'script_added': 'New Script',
      'interaction_type': 'Interaction',
      'iframe_guide_doc': 'iFrame Guide Doc',
      'iframe_guide_webpage': 'iFrame Guide Webpage',
      'config_change': 'Config Change',
      'stage_type': 'Stage Type',
      'substage_type': 'Substage Type',
      'stages_count': 'Stages Count',
      'substages_count': 'Substages Count',
      'stage_added': 'New Stage',
      'stage_removed': 'Stage Removed',
      'substage_added': 'New Substage',
      'substage_removed': 'Substage Removed',
      'new_lesson': 'New Lesson',
      'content_added': 'Content Added',
      'content_removed': 'Content Removed',
      'content_updated': 'Content Updated'
    };
    return labels[type] || type;
  }

  getChangeCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'new_lesson': 'New Lesson',
      'metadata': 'Metadata Changes',
      'structure': 'Structure Changes',
      'script': 'Script Changes',
      'interaction': 'Interaction Changes',
      'interaction_config': 'Interaction Config Changes',
      'content_submission': 'Content Submission',
      'other': 'Other Changes'
    };
    return labels[category] || category;
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
  }

  goBack() {
    this.router.navigate(['/super-admin']);
  }

  // Content Approvals Methods
  async loadPendingContent() {
    this.loadingContent = true;
    try {
      await this.contentSourceService.loadContentSources('pending');
      this.contentSourceService.pendingContent$.subscribe(pending => {
        this.pendingContent = pending;
        this.loadingContent = false;
      });
    } catch (error) {
      console.error('[ApprovalQueue] Failed to load pending content:', error);
      this.loadingContent = false;
    }
  }

  toggleContentExpand(contentId: string) {
    this.expandedContent[contentId] = !this.expandedContent[contentId];
  }

  canApproveContent(source: ContentSource): boolean {
    const userRole = environment.userRole;
    return userRole === 'super-admin' || userRole === 'admin';
  }

  async approveContent(id: string) {
    if (!confirm('Approve this content source? It will be indexed in Weaviate for semantic search.')) {
      return;
    }

    this.processingContent = true;
    try {
      const approved = await this.contentSourceService.approveContent(id);
      console.log('[ApprovalQueue] Content approved:', approved);
      alert(`✅ Content approved and indexed in Weaviate!`);
      await this.loadPendingContent();
    } catch (error) {
      console.error('[ApprovalQueue] Failed to approve content:', error);
      alert('Failed to approve content source');
    } finally {
      this.processingContent = false;
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

    this.processingContent = true;
    try {
      await this.contentSourceService.rejectContent(id, this.rejectionReason);
      console.log('[ApprovalQueue] Content rejected:', id);
      alert('Content source rejected');
      this.cancelReject();
      await this.loadPendingContent();
    } catch (error) {
      console.error('[ApprovalQueue] Failed to reject content:', error);
      alert('Failed to reject content source');
    } finally {
      this.processingContent = false;
    }
  }

  viewContentSource(source: ContentSource) {
    this.viewingContentSource = source;
    // Hide header when modal opens
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = 'none';
    }
  }

  closeContentViewModal() {
    this.viewingContentSource = null;
    // Show header when modal closes
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
  }

  async onContentSourceDeleted(contentSourceId: string) {
    console.log('[ApprovalQueue] Content source deleted:', contentSourceId);
    await this.loadPendingContent();
    this.closeContentViewModal();
  }

  async onContentSourceReprocessed(contentSourceId: string) {
    console.log('[ApprovalQueue] Content source reprocessed:', contentSourceId);
    await this.loadPendingContent();
  }
}

