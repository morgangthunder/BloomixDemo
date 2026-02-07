// CACHE BUST v2.3.0 - LESSON EDITOR COMPONENT - FORCE CACHE CLEAR - ID: abc123def
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonService } from '../../core/services/lesson.service';
import { ContentSourceService } from '../../core/services/content-source.service';
import { Lesson } from '../../core/models/lesson.model';
import { ContentSource } from '../../core/models/content-source.model';
import { Subject, firstValueFrom, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContentProcessorModalComponent } from '../../shared/components/content-processor-modal/content-processor-modal.component';
import { ApprovalQueueModalComponent } from '../../shared/components/approval-queue-modal/approval-queue-modal.component';
import { ProcessedContentService, ProcessedContentItem } from '../../core/services/processed-content.service';
import { ContentLibraryModalComponent } from '../../shared/components/content-library-modal/content-library-modal.component';
import { AddTextContentModalComponent } from '../../shared/components/add-text-content-modal/add-text-content-modal.component';
import { AddImageModalComponent } from '../../shared/components/add-image-modal/add-image-modal.component';
import { AddPdfModalComponent } from '../../shared/components/add-pdf-modal/add-pdf-modal.component';
import { InteractionConfigureModalComponent } from '../../shared/components/interaction-configure-modal/interaction-configure-modal.component';
import { ContentSourceViewModalComponent } from '../../shared/components/content-source-view-modal/content-source-view-modal.component';

type EditorTab = 'details' | 'structure' | 'script' | 'content' | 'preview' | 'ai-assistant';

interface Stage {
  id: string;
  title: string;
  type: 'trigger' | 'explore' | 'absorb' | 'cultivate' | 'hone';
  subStages: SubStage[];
  expanded?: boolean;
}

interface SubStage {
  id: string;
  title: string;
  type: string;
  duration: number; // minutes
  interactionType?: string;
  contentOutputId?: string;
  scriptBlocks?: ScriptBlock[];
  interaction?: {
    id?: string;
    name?: string;
    category?: string;
    type: string;
    contentOutputId: string;
    config?: any;
  };
}

interface ScriptBlock {
  id: string;
  type: 'teacher_talk' | 'load_interaction' | 'pause';
  content: string;
  startTime: number; // seconds
  endTime: number;
  metadata?: any;
  // Display configuration (for teacher_talk blocks)
  showInSnack?: boolean; // Show in snack message
  snackDuration?: number; // Duration in milliseconds (undefined = until manually closed)
  openChatUI?: boolean; // Open/restore chat UI if minimized
  minimizeChatUI?: boolean; // Minimize chat UI on load
  activateFullscreen?: boolean; // Activate fullscreen on load
  autoProgressAtEnd?: boolean; // Auto-progress to next sub-stage when interaction time ends (default: true)
}

interface ProcessedContentOutput {
  id: string;
  name: string;
  type: string; // 'qa_pairs', 'summary', 'facts', etc.
  data: any;
  workflowName: string;
}

        // VERSION CHECK: This component should show "VERSION 0.0.5" in console logs
        const LESSON_EDITOR_VERSION = '0.0.5';
        const LESSON_EDITOR_VERSION_CHECK_MESSAGE = `🚀 LESSON EDITOR COMPONENT VERSION ${LESSON_EDITOR_VERSION} LOADED - ${new Date().toISOString()} - CACHE BUST ID: ${Math.random().toString(36).substr(2, 9)}`;

@Component({
  selector: 'app-lesson-editor-v2',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ContentProcessorModalComponent, 
    ApprovalQueueModalComponent, 
    ContentLibraryModalComponent,
    AddTextContentModalComponent,
    AddImageModalComponent,
    AddPdfModalComponent,
    InteractionConfigureModalComponent,
    ContentSourceViewModalComponent
  ],
  template: `
    <div class="lesson-editor-v2" *ngIf="lesson">
      <!-- Top Header -->
      <header class="editor-header">
        <div class="header-left">
          <button (click)="goBack()" class="btn-icon" title="Back to Lesson Builder">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
          </button>
          <div class="header-title">
            <h1>{{isNewLesson ? 'Create New Lesson' : 'Edit Lesson'}}</h1>
            <p class="subtitle">{{lesson.title || 'Untitled Lesson'}}</p>
          </div>
        </div>
        <div class="header-actions">
          <!-- Desktop: Full buttons -->
          <button (click)="saveDraft()" 
                  class="btn-secondary desktop-full mobile-icon" 
                  [disabled]="saving || (!hasUnsavedChanges && lastSaved)" 
                  [class.saved]="!hasUnsavedChanges && lastSaved"
                  title="{{!hasUnsavedChanges && lastSaved ? 'Saved ' + (lastSaved | date:'short') : saving ? 'Saving...' : 'Save Draft'}}">
            <span class="desktop-only" *ngIf="!saving">💾 {{hasUnsavedChanges ? 'Save Draft' : 'Saved'}}</span>
            <span class="desktop-only" *ngIf="saving">💾 Saving...</span>
            <span class="mobile-only">💾</span>
          </button>
          <span class="desktop-only save-status" *ngIf="lastSaved && !saving && !hasUnsavedChanges" style="display: flex; align-items: center; gap: 0.5rem;">
            <small style="color: #999;">Saved {{lastSaved | date:'short'}}</small>
            <button *ngIf="hasPendingDraftOnServer()" 
                    (click)="viewPendingChanges()" 
                    class="btn-view-changes"
                    style="padding: 0.25rem 0.75rem; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: white; cursor: pointer; font-size: 12px;"
                    title="View pending changes">
              👁️ View Changes
            </button>
          </span>
          <button *ngIf="hasPendingDraftOnServer()" 
                  (click)="togglePendingChanges()" 
                  class="btn-secondary desktop-full mobile-icon"
                  [class.active]="showingPendingChanges"
                  title="{{showingPendingChanges ? 'Show Current State' : 'Show Pending Changes'}}">
            <span class="desktop-only">{{showingPendingChanges ? '📋 Show Current State' : '📝 Show Pending Changes'}}</span>
            <span class="mobile-only">{{showingPendingChanges ? '📋' : '📝'}}</span>
          </button>
          <button (click)="submitForApproval()" 
                  class="btn-primary desktop-full mobile-icon" 
                  [disabled]="hasBeenSubmitted || saving || !canSubmit()" 
                  [class.submitted]="hasBeenSubmitted"
                  [title]="hasBeenSubmitted ? 'Already submitted' : (hasContentChanges ? 'Submit for Approval' : 'Publish Changes')">
            <span class="desktop-only">{{hasBeenSubmitted ? '✓ Submitted' : (hasContentChanges ? '✓ Submit for Approval' : '✓ Publish')}}</span>
            <span class="mobile-only">✓</span>
          </button>
        </div>
      </header>

      <!-- Main Layout: Sidebar + Tab Content -->
      <div class="editor-layout">
        <!-- Left Sidebar: Lesson Structure Tree -->
        <aside class="structure-sidebar" [class.collapsed]="sidebarCollapsed" [class.mobile-open]="mobileSidebarOpen" [style.width.px]="sidebarCollapsed ? 60 : sidebarWidth">
          <div class="sidebar-header">
            <h3>Lesson Structure</h3>
            <div class="sidebar-controls">
              <button (click)="toggleSidebar()" class="btn-icon" title="{{sidebarCollapsed ? 'Expand' : 'Collapse'}}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    [attr.d]="sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="sidebar-content" *ngIf="!sidebarCollapsed">
            <!-- Lesson root -->
            <div class="tree-item lesson-item" 
                 [class.selected]="selectedItem.type === 'lesson'"
                 (click)="selectItem({type: 'lesson', id: (lesson.id || '') + ''})">
              <span class="item-icon">📚</span>
              <span class="item-label">{{lesson.title || 'Lesson'}}</span>
            </div>

            <!-- Stages -->
            <div *ngFor="let stage of stages; let i = index" class="tree-item-group">
              <div class="tree-item stage-item"
                   [class.selected]="selectedItem.type === 'stage' && selectedItem.id === stage.id"
                   [class.drag-over]="dragOverStageId === stage.id"
                   draggable="true"
                   (dragstart)="onStageDragStart(stage, $event)"
                   (dragover)="onStageDragOver(stage.id, $event)"
                   (dragleave)="onStageDragLeave()"
                   (drop)="onStageDrop(stage, $event)"
                   (click)="selectItem({type: 'stage', id: stage.id})">
                <button (click)="toggleStageExpanded(stage.id, $event)" class="expand-btn">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      [attr.d]="stage.expanded ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'"></path>
                  </svg>
                </button>
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <span class="item-icon">{{getStageIcon(stage.type)}}</span>
                <span class="item-label">{{stage.title || 'Stage ' + (i+1)}}</span>
                <button (click)="deleteStage(stage.id, $event)" class="delete-btn" title="Delete stage">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>

              <!-- SubStages -->
              <div *ngIf="stage.expanded" class="substage-list">
                <div *ngFor="let substage of stage.subStages; let j = index" 
                     class="tree-item substage-item"
                     [class.selected]="selectedItem.type === 'substage' && selectedItem.id === substage.id"
                     [class.drag-over]="dragOverSubStageId === substage.id"
                     draggable="true"
                     (dragstart)="onSubStageDragStart(substage, stage.id, $event)"
                     (dragover)="onSubStageDragOver(substage.id, $event)"
                     (dragleave)="onSubStageDragLeave()"
                     (drop)="onSubStageDrop(substage, stage.id, $event)"
                     (click)="selectItem({type: 'substage', id: substage.id, stageId: stage.id})">
                  <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                  <span class="item-icon">▪</span>
                  <span class="item-label">{{substage.title || 'Substage ' + (j+1)}}</span>
                  <button (click)="deleteSubStage(stage.id, substage.id, $event)" class="delete-btn" title="Delete substage">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
                <button (click)="addSubStage(stage.id)" class="add-item-btn">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                  Add Substage
                </button>
              </div>
            </div>

            <!-- Add Stage Button -->
            <button (click)="addStage()" class="add-item-btn primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Stage
            </button>
          </div>

          <!-- Collapsed sidebar indicator -->
          <div *ngIf="sidebarCollapsed" class="sidebar-collapsed-content">
            <button (click)="toggleSidebar()" class="btn-icon rotate-90">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
          
          <!-- Resize Handle -->
          <div *ngIf="!sidebarCollapsed" class="sidebar-resize-handle" (mousedown)="onResizeMouseDown($event)" title="Drag to resize"></div>
        </aside>

        <!-- Main Content Area: Tabs + Panel -->
        <main class="editor-main">
          <!-- Tab Navigation -->
          <nav class="tab-nav">
            <button *ngFor="let tab of tabs" 
                    (click)="activeTab = tab.id"
                    class="tab-btn"
                    [class.active]="activeTab === tab.id"
                    [title]="tab.label">
              <span class="tab-icon">{{tab.icon}}</span>
              <span class="tab-label">{{tab.label}}</span>
              <span *ngIf="tab.badge" class="tab-badge">{{tab.badge}}</span>
            </button>
          </nav>

          <!-- Tab Content -->
          <div class="tab-content">
            <!-- Details Panel -->
            <div *ngIf="activeTab === 'details'" class="panel details-panel">
              <h2 class="panel-title">Lesson Details</h2>
              <div class="form-grid">
                <div class="form-group full-width">
                  <label for="title">Title *</label>
                  <input id="title" type="text" [(ngModel)]="lesson.title" (ngModelChange)="markAsChanged()" placeholder="e.g., JavaScript Fundamentals" required />
                </div>
                <div class="form-group full-width">
                  <label for="description">Description *</label>
                  <textarea id="description" [(ngModel)]="lesson.description" (ngModelChange)="markAsChanged()" rows="3" placeholder="Brief overview of what students will learn" required></textarea>
                </div>
                <div class="form-group">
                  <label for="category">Category *</label>
                  <select id="category" [(ngModel)]="lesson.category" (ngModelChange)="markAsChanged()" required>
                    <option value="">Select category</option>
                    <option value="Programming">Programming</option>
                    <option value="Design">Design</option>
                    <option value="Business">Business</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Language">Language</option>
                    <option value="Science">Science</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="difficulty">Difficulty *</label>
                  <select id="difficulty" [(ngModel)]="lesson.difficulty" (ngModelChange)="markAsChanged()" required>
                    <option value="">Select difficulty</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="duration">Duration (minutes)</label>
                  <input id="duration" type="number" [(ngModel)]="lesson.durationMinutes" min="5" max="180" />
                  <small class="hint">Calculated: {{calculateTotalDuration()}} min</small>
                </div>
                <div class="form-group">
                  <label for="thumbnail">Thumbnail URL</label>
                  <input id="thumbnail" type="url" [(ngModel)]="lesson.thumbnailUrl" placeholder="https://..." />
                </div>
                <div class="form-group full-width">
                  <label for="tags">Tags (comma-separated)</label>
                  <input id="tags" type="text" [(ngModel)]="tagsString" placeholder="javascript, programming, web-development" />
                </div>
              </div>

              <!-- Learning Objectives Section -->
              <div class="form-section">
                <h3 class="section-title">Learning Objectives</h3>
                <p class="section-description">What will appear in the lesson preview letting students know briefly what the lesson covers</p>
                <div class="objectives-list">
                  <div *ngFor="let objective of learningObjectives; let i = index; trackBy: trackByObjectiveIndex" class="objective-item">
                    <input 
                      type="text" 
                      [(ngModel)]="learningObjectives[i]" 
                      (blur)="markAsChanged()"
                      placeholder="e.g., Understand JavaScript variables and functions"
                      class="objective-input" />
                    <button 
                      (click)="removeLearningObjective(i)" 
                      class="btn-icon-small"
                      title="Remove objective">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                  <button (click)="addLearningObjective()" class="btn-secondary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Learning Objective
                  </button>
                </div>
              </div>

              <!-- Lesson Outcomes Section -->
              <div class="form-section">
                <h3 class="section-title">Lesson Outcomes</h3>
                <p class="section-description">What students will know or be able to do at the end of this lesson. Details are important here and this content should align closely with any attempts at evaluation at the end of the lesson.</p>
                <div class="outcomes-list">
                  <div *ngFor="let outcome of lessonOutcomes; let i = index; trackBy: trackByOutcomeIndex" class="outcome-item">
                    <div class="outcome-header">
                      <input 
                        type="text" 
                        [(ngModel)]="outcome.title" 
                        (blur)="markAsChanged()"
                        placeholder="Outcome title"
                        class="outcome-title-input" />
                      <button 
                        (click)="removeLessonOutcome(i)" 
                        class="btn-icon-small"
                        title="Remove outcome">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                    <textarea 
                      [(ngModel)]="outcome.content" 
                      (blur)="markAsChanged()"
                      placeholder="At the end of this lesson student will know..."
                      rows="3"
                      class="outcome-content-input"></textarea>
                  </div>
                  <button (click)="addLessonOutcome()" class="btn-secondary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Lesson Outcome
                  </button>
                </div>
              </div>
            </div>

            <!-- Structure Panel -->
            <div *ngIf="activeTab === 'structure'" class="panel structure-panel">
              <h2 class="panel-title">Lesson Structure</h2>
              <p class="panel-description">Build your lesson using the TEACH method stages. Add stages and substages from the sidebar.</p>
              
              <div *ngIf="selectedItem.type === 'lesson'" class="info-card">
                <h3>📚 Lesson Overview</h3>
                <p>Select a stage or substage from the sidebar to edit its details here.</p>
                <div class="stats-grid">
                  <div class="stat">
                    <span class="stat-label">Stages</span>
                    <span class="stat-value">{{stages.length}}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Substages</span>
                    <span class="stat-value">{{getTotalSubStages()}}</span>
                  </div>
                  <div class="stat">
                    <span class="stat-label">Duration</span>
                    <span class="stat-value">{{calculateTotalDuration()}} min</span>
                  </div>
                </div>
              </div>

              <!-- Stage Config -->
              <div *ngIf="selectedItem.type === 'stage'" class="config-card">
                <h3>{{getSelectedStage()?.type | uppercase}} Stage</h3>
                <div class="form-group">
                  <label for="stage-title">Stage Title</label>
                  <input id="stage-title" type="text" [(ngModel)]="getSelectedStage()!.title" placeholder="Stage title" />
                </div>
                <div class="form-group">
                  <label for="stage-type">Stage Type</label>
                  <select id="stage-type" [(ngModel)]="getSelectedStage()!.type">
                    <option value="tease">Tease (T) - Hook & Spark Curiosity</option>
                    <option value="explore">Explore (E) - Discover & Investigate</option>
                    <option value="absorb">Absorb (A) - Learn & Internalize</option>
                    <option value="cultivate">Cultivate (C) - Practice & Apply</option>
                    <option value="hone">Hone (H) - Master & Assess</option>
                  </select>
                </div>
                <p class="hint">{{getStageTypeDescription(getSelectedStage()?.type || '')}}</p>
              </div>

              <!-- SubStage Config -->
              <div *ngIf="selectedItem.type === 'substage'" class="config-card">
                <h3>Substage Configuration</h3>
                <div class="form-group">
                  <label for="substage-title">Title</label>
                  <input id="substage-title" type="text" [(ngModel)]="getSelectedSubStage()!.title" placeholder="Substage title" />
                </div>
                <div class="form-group">
                  <label for="substage-type">Substage Type (TEACH)</label>
                  <select 
                    id="substage-type" 
                    [(ngModel)]="getSelectedSubStage()!.type"
                    [disabled]="!getSelectedStage()?.type">
                    <option value="" *ngIf="!getSelectedStage()?.type">
                      Stage has no type - select a stage type first
                    </option>
                    <option value="" *ngIf="getSelectedStage()?.type">Select type...</option>
                    <option *ngFor="let type of getAvailableSubStageTypes(getSelectedStage()?.type || '')" [value]="type">
                      {{getSubStageTypeLabel(type)}}
                    </option>
                  </select>
                  <small class="hint" *ngIf="getSelectedStage()?.type">
                    Based on parent stage type: {{getSelectedStage()?.type | uppercase}}
                  </small>
                  <small class="hint error-hint" *ngIf="!getSelectedStage()?.type">
                    ⚠️ Please select a stage type first to choose a sub-stage type
                  </small>
                </div>
                <div class="form-group">
                  <label for="substage-duration">Duration (minutes)</label>
                  <input id="substage-duration" type="number" [(ngModel)]="getSelectedSubStage()!.duration" min="1" max="60" />
                </div>
                
                <div class="interaction-config">
                  <label>Interaction Type</label>
                  <div class="config-value">
                    <span class="value">{{getSelectedSubStage()?.interaction?.type || 'None'}}</span>
                    <div class="interaction-actions">
                      <button (click)="changeInteractionType()" class="btn-small">Change</button>
                      <button *ngIf="getSelectedSubStage()?.interaction" (click)="configureInteraction()" class="btn-small btn-primary">⚙️ Configure</button>
                    </div>
                  </div>
                </div>

                <div class="content-config">
                  <label>Processed Content</label>
                  <div class="config-value">
                    <span class="value">{{getSelectedSubStage()?.contentOutputId ? getContentOutputName(getSelectedSubStage()!.contentOutputId!) : 'None'}}</span>
                    <button (click)="openProcessedContentPicker('structure')" class="btn-small">Select</button>
                  </div>
                </div>

                <button (click)="activeTab = 'script'" class="btn-secondary full-width mt-4">
                  📜 Edit Script Timeline →
                </button>
              </div>
            </div>

            <!-- Script Panel -->
            <div *ngIf="activeTab === 'script'" class="panel script-panel">
              <h2 class="panel-title">Script Timeline</h2>
              <p class="panel-description" *ngIf="selectedItem.type !== 'substage'">
                Select a substage from the sidebar to edit its script.
              </p>
              
              <div *ngIf="selectedItem.type === 'substage'" class="script-editor">
                <div class="script-header">
                  <h3>{{getSelectedSubStage()?.title}} ({{getSelectedSubStage()?.duration}} min)</h3>
                  <button (click)="addScriptBlock()" class="btn-primary">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Block
                  </button>
                </div>

                <div class="timeline">
                  <div class="timeline-ruler">
                    <span class="time-marker">0:00</span>
                    <span class="time-marker">{{formatTime((getSelectedSubStage()?.duration || 5) * 30)}}</span>
                    <span class="time-marker">{{formatTime((getSelectedSubStage()?.duration || 5) * 60)}}</span>
                  </div>

                  <div class="script-blocks">
                    <div *ngFor="let block of getSelectedSubStage()?.scriptBlocks || []; let i = index; trackBy: trackByBlockId" 
                         class="script-block" 
                         [class.teacher-talk]="block.type === 'teacher_talk'"
                         [class.load-interaction]="block.type === 'load_interaction'"
                         [class.pause]="block.type === 'pause'"
                         [class.drag-over]="dragOverScriptBlockIndex === i"
                         [class.collapsed]="isScriptBlockCollapsed(block.id)"
                         draggable="true"
                         (dragstart)="onScriptBlockDragStart(block, i, $event)"
                         (dragover)="onScriptBlockDragOver(i, $event)"
                         (dragleave)="onScriptBlockDragLeave()"
                         (drop)="onScriptBlockDrop(i, $event)">
                      <div class="block-header" (click)="toggleScriptBlockCollapseByIndex(i, $event)">
                        <span class="drag-handle" title="Drag to reorder" (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">⋮⋮</span>
                        <button type="button" class="collapse-toggle" (click)="toggleScriptBlockCollapseByIndex(i, $event)">
                          <span *ngIf="isScriptBlockCollapsed(block.id)">▶</span>
                          <span *ngIf="!isScriptBlockCollapsed(block.id)">▼</span>
                        </button>
                        <span class="block-type-icon" (click)="$event.stopPropagation()">{{getBlockIcon(block.type)}}</span>
                        <span class="block-type-label" (click)="$event.stopPropagation()">{{getBlockTypeLabel(block.type)}}</span>
                        <span class="block-time-display" (click)="$event.stopPropagation()">{{formatTime(block.startTime)}} - {{formatTime(block.endTime)}}</span>
                        <button (click)="deleteScriptBlock(i); $event.stopPropagation()" class="btn-icon" title="Delete block">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                      <div class="block-content" *ngIf="!isScriptBlockCollapsed(block.id)" (click)="$event.stopPropagation()">
                        <select [(ngModel)]="block.type" (ngModelChange)="markAsChanged()" class="block-type-select">
                          <option value="teacher_talk">👨‍🏫 Teacher Talk</option>
                          <option value="load_interaction">🎯 Interaction</option>
                          <option value="pause">⏸ Pause for Question</option>
                        </select>
                        <div class="block-time">
                          <input type="text" 
                                 [value]="formatTime(block.startTime)" 
                                 (blur)="updateTimeFromString($event, block, 'startTime')"
                                 (keydown.enter)="updateTimeFromString($event, block, 'startTime')"
                                 placeholder="0:00" 
                                 pattern="[0-9]{1,2}:[0-5][0-9]"
                                 title="Enter time as MM:SS (e.g., 0:30)" />
                          <span>-</span>
                          <input type="text" 
                                 [value]="formatTime(block.endTime)" 
                                 (blur)="updateTimeFromString($event, block, 'endTime')"
                                 (keydown.enter)="updateTimeFromString($event, block, 'endTime')"
                                 placeholder="0:00" 
                                 pattern="[0-9]{1,2}:[0-5][0-9]"
                                 title="Enter time as MM:SS (e.g., 1:30)" />
                        </div>
                        <textarea *ngIf="block.type === 'teacher_talk'" 
                                  [(ngModel)]="block.content" 
                                  (ngModelChange)="markAsChanged()"
                                  placeholder="Enter what the AI teacher should say..."
                                  rows="3"></textarea>
                        
                        <!-- Display Configuration -->
                        <div class="script-block-config">
                          <!-- Show in snack message - only for teacher_talk blocks -->
                          <div *ngIf="block.type === 'teacher_talk'" class="config-section">
                            <label class="checkbox-label">
                              <input type="checkbox" 
                                     [(ngModel)]="block.showInSnack" 
                                     (ngModelChange)="markAsChanged()"
                                     [checked]="block.showInSnack || false">
                              <span> Show in snack message</span>
                            </label>
                          </div>
                          
                          <div *ngIf="block.type === 'teacher_talk' && block.showInSnack" class="config-section">
                            <label>Snack duration</label>
                            <div class="snack-duration-input">
                              <input type="number" 
                                     [ngModel]="block.snackDuration ? block.snackDuration / 1000 : null" 
                                     (ngModelChange)="onSnackDurationChange($event, block)"
                                     placeholder="Leave empty"
                                     min="0"
                                     step="1"
                                     class="snack-duration-field">
                              <span class="duration-unit">seconds</span>
                            </div>
                          </div>
                          
                          <!-- Chat UI controls - mutually exclusive, available for all script block types -->
                          <div class="config-section">
                            <label class="checkbox-label">
                              <input type="checkbox" 
                                     [(ngModel)]="block.openChatUI" 
                                     (ngModelChange)="onOpenChatUIChange($event, block)"
                                     [checked]="block.openChatUI || false"
                                     [disabled]="block.minimizeChatUI || false">
                              <span> Open chat UI if minimized</span>
                            </label>
                          </div>
                          
                          <div class="config-section">
                            <label class="checkbox-label">
                              <input type="checkbox" 
                                     [(ngModel)]="block.minimizeChatUI" 
                                     (ngModelChange)="onMinimizeChatUIChange($event, block)"
                                     [checked]="block.minimizeChatUI || false"
                                     [disabled]="block.openChatUI || false">
                              <span> Minimize chat UI</span>
                            </label>
                          </div>
                          
                          <!-- Fullscreen control - available for all script block types -->
                          <div class="config-section">
                            <label class="checkbox-label">
                              <input type="checkbox" 
                                     [(ngModel)]="block.activateFullscreen" 
                                     (ngModelChange)="markAsChanged()"
                                     [checked]="block.activateFullscreen || false">
                              <span> Activate fullscreen</span>
                            </label>
                          </div>
                          
                          <!-- Auto-progress at end - available for all script block types -->
                          <div class="config-section">
                            <label class="checkbox-label">
                              <input type="checkbox" 
                                     [(ngModel)]="block.autoProgressAtEnd" 
                                     (ngModelChange)="markAsChanged()"
                                     [checked]="block.autoProgressAtEnd !== false">
                              <span> Auto-progress at end</span>
                            </label>
                          </div>
                        </div>
                        
                        <div *ngIf="block.type === 'load_interaction'" class="interaction-selector">
                          <label>Interaction Type:</label>
                          <div class="interaction-display">
                            <span class="interaction-badge">{{block.metadata?.interactionType || getSelectedSubStage()?.interaction?.type || 'None'}}</span>
                            <div class="interaction-actions">
                              <button *ngIf="getSelectedSubStage()?.interaction" (click)="configureInteraction()" class="btn-small btn-primary">⚙️ Configure</button>
                              <button (click)="changeInteractionType()" class="btn-small">Change</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p *ngIf="!getSelectedSubStage()?.scriptBlocks || getSelectedSubStage()?.scriptBlocks?.length === 0" class="empty-state">
                      No script blocks yet. Click "Add Block" to start building your script timeline.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Content Panel -->
            <div *ngIf="activeTab === 'content'" class="panel content-panel">
              <h2 class="panel-title">Lesson Content</h2>
              <p class="panel-description">Source content and processed outputs used in this lesson.</p>
              
              <!-- Content Sources Section -->
              <div class="content-section">
                <div class="section-header">
                  <h3>📚 Content Sources ({{getSourceContentForLesson().length}})</h3>
                  <button (click)="searchContentLibrary()" class="btn-secondary btn-sm">+ Add Content</button>
                </div>
                
                <div class="content-list" *ngIf="getSourceContentForLesson().length > 0">
                  <div *ngFor="let source of getSourceContentForLesson()" class="content-card">
                    <div class="content-icon">
                      <span *ngIf="source.type === 'text'">📝</span>
                      <span *ngIf="source.type === 'pdf'">📄</span>
                      <span *ngIf="source.type === 'url'">🔗</span>
                      <span *ngIf="source.type === 'image'">🖼️</span>
                    </div>
                    <div class="content-info">
                      <h4>{{source.title}}</h4>
                      <p class="content-summary">{{source.summary}}</p>
                      <div class="content-meta">
                        <span class="type-badge">{{source.type}}</span>
                        <span class="auto-gen-badge" *ngIf="source.metadata?.autoGenerated">🤖 Auto-generated</span>
                      </div>
                    </div>
                    <div class="content-actions">
                      <button (click)="viewSourceContent(source)" class="btn-small">View</button>
                      <button (click)="editSourceContent(source)" class="btn-small">Edit</button>
                    </div>
                  </div>
                </div>
                <p *ngIf="getSourceContentForLesson().length === 0" class="empty-state-small">
                  No source content yet. Click "+ Add Content" to browse the library.
                </p>
              </div>

              <!-- Processed Content Section -->
              <div class="content-section">
                <div class="section-header">
                  <h3>🎬 Processed Content ({{processedContentItems.length}})</h3>
                </div>
                
                <div class="content-list" *ngIf="processedContentItems.length > 0">
                  <div *ngFor="let content of processedContentItems" class="content-card">
                    <div class="content-icon">
                      <span>🎯</span>
                    </div>
                    <div class="content-info">
                      <h4>{{content.title}}</h4>
                      <p class="content-summary">{{content.workflowName || 'Processed interaction data'}}</p>
                      <div class="content-meta">
                        <span class="type-badge">{{content.type}}</span>
                        <div class="source-link-inline" *ngIf="content.contentSource">
                          <svg class="link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                          </svg>
                          <small>from: {{content.contentSource.title}}</small>
                        </div>
                      </div>
                    </div>
                    <div class="content-actions">
                      <button (click)="viewProcessedContent(content)" class="btn-small">View JSON</button>
                      <button (click)="deleteProcessedContent(content)" class="btn-small btn-danger">Delete</button>
                    </div>
                  </div>
                </div>
                <p *ngIf="processedContentItems.length === 0" class="empty-state-small">
                  No processed content yet. Interactions added to substages will appear here.
                </p>
              </div>
            </div>

            <!-- Preview Panel -->
            <div *ngIf="activeTab === 'preview'" class="panel preview-panel">
              <h2 class="panel-title">Preview</h2>
              <p class="panel-description" *ngIf="selectedItem.type !== 'substage'">
                Select a substage to preview how students will experience it.
              </p>
              
              <div *ngIf="selectedItem.type === 'substage'" class="preview-container">
                <div class="student-view">
                  <div class="ai-teacher-message">
                    <span class="avatar">👨‍🏫</span>
                    <p *ngIf="getFirstScriptBlock()">{{getFirstScriptBlock()}}</p>
                    <p *ngIf="!getFirstScriptBlock()">AI Teacher message will appear here during preview...</p>
                  </div>
                  
                  <div class="interaction-preview">
                    <div *ngIf="isInteractionPreviewLoading" class="preview-loading">
                      <p>Loading interaction preview…</p>
                    </div>
                    <div *ngIf="!isInteractionPreviewLoading">
                      <div *ngIf="showInteractionNotConfiguredWarning()" class="interaction-warning">
                        <div class="warning-icon">⚠️</div>
                        <div>
                          <h3>Interaction Not Configured</h3>
                          <p>This interaction has not been configured correctly yet. Select processed content and save the draft to preview it here.</p>
                        </div>
                      </div>
                      <!-- True/False Selection is now an HTML interaction and will be rendered via HTML/PixiJS/iFrame Preview -->
                      <!-- HTML/PixiJS/iFrame Preview -->
                      <div *ngIf="!showInteractionNotConfiguredWarning() && interactionPreviewData && (interactionPreviewData.interactionCategory === 'html' || interactionPreviewData.interactionCategory === 'pixijs' || interactionPreviewData.interactionCategory === 'iframe') && interactionPreviewData.htmlCode" 
                           class="iframe-preview-container">
                        <iframe 
                          [src]="getInteractionPreviewBlobUrl()"
                          style="width: 100%; height: 600px; border: 1px solid #333; border-radius: 0.5rem; background: #0f0f23;"
                          frameborder="0"></iframe>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Assistant Panel -->
            <div *ngIf="activeTab === 'ai-assistant'" class="panel ai-panel-wrapper">
              <div class="ai-panel-header">
                <h2 class="panel-title">AI Lesson Assistant</h2>
                <p class="panel-description">Get help building your lesson, writing scripts, and refining content.</p>
                
                <div class="ai-context">
                  <strong>Context:</strong> 
                  <span *ngIf="selectedItem.type === 'lesson'">Entire lesson</span>
                  <span *ngIf="selectedItem.type === 'stage'">Stage: {{getSelectedStage()?.title}}</span>
                  <span *ngIf="selectedItem.type === 'substage'">Substage: {{getSelectedSubStage()?.title}}</span>
                </div>
              </div>

              <div class="ai-chat-scrollable">
                <div class="chat-messages">
                  <div class="chat-message ai">
                    <span class="avatar">🤖</span>
                    <div>
                      <p>Hi! I'm your AI lesson assistant. How can I help you build this lesson?</p>
                      <div class="quick-actions">
                        <button class="quick-action-btn">Help write script</button>
                        <button class="quick-action-btn">Suggest interaction type</button>
                        <button class="quick-action-btn">Improve content</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="ai-chat-input-sticky">
                <div class="chat-input">
                  <input type="text" placeholder="Ask me anything about your lesson..." [(ngModel)]="aiChatInput" (keyup.enter)="sendAIMessage()" />
                  <button (click)="sendAIMessage()" class="btn-primary">Send</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Mobile Sidebar Overlay -->
      <div *ngIf="mobileSidebarOpen" class="mobile-overlay" (click)="closeMobileSidebar()"></div>

      <!-- Mobile FAB -->
      <button class="mobile-fab" (click)="toggleMobileSidebar()" title="Lesson Structure">
        <!-- Document/Script Icon -->
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </button>

      <!-- Mobile Bottom Bar (Tabs Only) -->
      <div class="mobile-bottom-bar">
        <button *ngFor="let tab of tabs" 
                (click)="activeTab = tab.id"
                class="mobile-tab-btn"
                [class.active]="activeTab === tab.id">
          <span class="tab-icon">{{tab.icon}}</span>
        </button>
      </div>

      <!-- Snackbar -->
      <div class="snackbar" 
           [class.visible]="snackbarVisible"
           [class.success]="snackbarType === 'success'"
           [class.error]="snackbarType === 'error'"
           [class.info]="snackbarType === 'info'">
        {{snackbarMessage}}
      </div>

      <!-- Pending Changes Warning Modal -->
      <div *ngIf="showPendingChangesWarning" class="modal-overlay" (click)="closePendingWarning()">
        <div class="modal-content warning-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>⚠️ Overwrite Pending Changes?</h2>
            <button (click)="closePendingWarning()" class="close-button">✕</button>
          </div>
          <div class="modal-body">
            <p>This lesson has multiple pending changes awaiting approval.</p>
            <p><strong>If you {{pendingWarningAction === 'save' ? 'save' : 'submit'}} now, the older pending draft(s) will be discarded.</strong></p>
            <p *ngIf="olderDraftIds.length > 0">The {{olderDraftIds.length}} older pending draft(s) will be deleted and replaced with your new changes.</p>
            <div class="warning-actions">
              <button class="btn-secondary" (click)="closePendingWarning()">Cancel</button>
              <button class="btn-primary" (click)="confirmPendingWarning()">
                {{pendingWarningAction === 'save' ? 'Save & Discard Older' : 'Submit & Discard Older'}}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Processor Modal -->
      <app-content-processor-modal 
        [isOpen]="showContentProcessor"
        [lessonId]="lesson?.id"
        [videoId]="contentProcessorVideoId"
        [resumeProcessing]="contentProcessorResumeProcessing"
        (contentProcessed)="onContentProcessed($event)"
        (contentSubmittedForApproval)="onContentSubmittedForApproval($event)"
        (closed)="closeContentProcessor()">
      </app-content-processor-modal>

      <!-- Approval Queue Modal -->
      <app-approval-queue-modal 
        [isOpen]="showApprovalQueue"
        (itemApproved)="onItemApproved($event)"
        (itemRejected)="onItemRejected($event)"
        (close)="closeApprovalQueue()">
      </app-approval-queue-modal>

      <!-- Content Library Modal -->
      <app-content-library-modal
        [isOpen]="showContentLibrary"
        [lessonId]="lesson?.id"
        (contentAdded)="onContentAdded($event)"
        (closed)="closeContentLibrary()">
      </app-content-library-modal>

      <!-- Interaction Type Selection Modal -->
      <div *ngIf="showInteractionTypeModal" class="modal-overlay-fullscreen" (click)="closeInteractionTypeModal()">
        <div class="modal-container-fullscreen" (click)="$event.stopPropagation()" style="max-width: 900px;">
          <div class="modal-header-sticky">
            <h2>🎮 Select Interaction Type</h2>
            <button (click)="closeInteractionTypeModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body-scrollable">
            <div class="interaction-types-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; padding: 1rem;">
              <div 
                *ngFor="let type of availableInteractionTypes" 
                class="interaction-type-card"
                (click)="selectInteractionType(type)"
                [class.selected]="getSelectedSubStage()?.interaction?.type === type.id"
                style="background: #1a1a1a; border: 2px solid #333; border-radius: 0.5rem; padding: 1.5rem; cursor: pointer; transition: all 0.2s;">
                <div class="card-icon" style="font-size: 3rem; text-align: center; margin-bottom: 1rem;">
                  <span *ngIf="type.interactionTypeCategory === 'html'">🌐</span>
                  <span *ngIf="type.interactionTypeCategory === 'pixijs'">🎮</span>
                  <span *ngIf="type.interactionTypeCategory === 'iframe'">🖼️</span>
                  <span *ngIf="!type.interactionTypeCategory || type.interactionTypeCategory === 'legacy'">📦</span>
                </div>
                <div class="card-content">
                  <h3 style="color: #fff; margin: 0 0 0.5rem 0; font-size: 1.25rem;">{{type.name}}</h3>
                  <p class="card-category" style="color: #00d4ff; font-size: 0.875rem; margin: 0 0 0.5rem 0; font-weight: 500;">{{getCategoryLabel(type.interactionTypeCategory || 'legacy')}}</p>
                  <p class="card-description" style="color: #999; font-size: 0.875rem; margin: 0; line-height: 1.4;">{{type.description}}</p>
                </div>
              </div>
            </div>
            
            <p *ngIf="availableInteractionTypes.length === 0" class="empty-state">
              Loading interaction types...
            </p>
          </div>

          <div class="modal-footer-sticky">
            <button (click)="closeInteractionTypeModal()" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Add Text Content Modal -->
      <app-add-text-content-modal
        [isOpen]="showTextModal"
        [lessonId]="lesson?.id"
        (close)="closeTextModal()"
        (contentAdded)="onNewContentAdded($event)">
      </app-add-text-content-modal>

      <!-- Add Image Modal -->
      <app-add-image-modal
        [isOpen]="showImageModal"
        [lessonId]="lesson?.id"
        (close)="closeImageModal()"
        (contentAdded)="onNewContentAdded($event)">
      </app-add-image-modal>

      <!-- Add PDF Modal -->
      <app-add-pdf-modal
        [isOpen]="showPdfModal"
        [lessonId]="lesson?.id"
        (close)="closePdfModal()"
        (contentAdded)="onNewContentAdded($event)">
      </app-add-pdf-modal>

      <!-- Source Content View Modal (Shared Component) -->
      <app-content-source-view-modal
        [isOpen]="showSourceContentViewModal"
        [contentSource]="viewingSourceContent"
        (closed)="closeSourceContentViewModal()"
        (deleted)="onSourceContentDeleted($event)"
        (reprocessed)="onSourceContentReprocessed($event)">
      </app-content-source-view-modal>

      <!-- Source Content Editor Modal -->
      <div class="modal-overlay-fullscreen" *ngIf="showSourceContentModal" (click)="closeSourceContentModal()">
        <div class="modal-container-fullscreen" (click)="$event.stopPropagation()">
          <div class="modal-header-sticky">
            <h2>📝 Edit Source Content</h2>
            <button (click)="closeSourceContentModal()" class="close-btn">✕</button>
          </div>

          <div class="modal-body-scrollable" *ngIf="selectedSourceContent">
            <div class="form-group">
              <label for="source-title">Title</label>
              <input id="source-title" type="text" [(ngModel)]="selectedSourceContent.title" class="form-input" />
            </div>

            <div class="form-group">
              <label for="source-summary">Summary</label>
              <textarea id="source-summary" [(ngModel)]="selectedSourceContent.summary" rows="3" class="form-input"></textarea>
            </div>

            <div class="form-group">
              <label for="source-text">Full Text</label>
              <textarea id="source-text" [(ngModel)]="selectedSourceContent.fullText" rows="15" class="form-input" style="font-family: monospace;"></textarea>
            </div>

            <div *ngIf="selectedSourceContent.metadata?.autoGenerated" class="info-note">
              <span>🤖</span>
              <p>This content was auto-generated from interaction JSON. Changes will not automatically update the interaction.</p>
            </div>
          </div>

          <div class="modal-footer-sticky">
            <button (click)="closeSourceContentModal()" class="btn-secondary">Cancel</button>
            <button (click)="saveSourceContent()" class="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>

      <!-- Processed Content JSON Editor Modal -->
      <div class="modal-overlay-fullscreen" *ngIf="showProcessedContentJsonModal" (click)="closeProcessedContentViewer()">
        <div class="modal-container-fullscreen" (click)="$event.stopPropagation()">
          <div class="modal-header-sticky">
            <h2>🎯 Edit Processed Content JSON</h2>
            <button (click)="closeProcessedContentViewer()" class="close-btn">✕</button>
          </div>

          <div class="modal-body-scrollable" *ngIf="selectedProcessedJson">
            <div class="form-group">
              <label for="processed-name">Name</label>
              <input id="processed-name" type="text" [(ngModel)]="selectedProcessedJson.outputName" class="form-input" />
            </div>

            <div class="form-group">
              <label>Type</label>
              <p class="readonly-value">{{selectedProcessedJson.outputType}}</p>
            </div>

            <div class="form-group">
              <label for="processed-json">Output Data (JSON)</label>
              <textarea id="processed-json" [(ngModel)]="selectedProcessedJson.outputDataJson" rows="20" class="form-input json-editor" spellcheck="false"></textarea>
              <small class="hint">Edit the JSON data directly. Make sure it remains valid JSON.</small>
            </div>

            <div class="info-note" *ngIf="selectedProcessedJson.contentSource">
              <span>🔗</span>
              <p>Linked to source: {{selectedProcessedJson.contentSource.title}}</p>
            </div>
          </div>

          <div class="modal-footer-sticky">
            <button (click)="closeProcessedContentViewer()" class="btn-secondary">Cancel</button>
            <button (click)="saveProcessedContentJson()" class="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>

      <!-- Processed Content Picker Modal -->
      <div class="modal-overlay-fullscreen" *ngIf="showProcessedContentPicker" (click)="closeProcessedContentPicker()">
        <div class="modal-container-fullscreen" (click)="$event.stopPropagation()">
          <div class="modal-header-sticky">
            <h2>🎯 Select Processed Content</h2>
            <button (click)="closeProcessedContentPicker()" class="close-btn">✕</button>
          </div>

          <div class="modal-body-scrollable">
            <div class="search-section">
              <div class="search-bar">
                <input
                  type="text"
                  [(ngModel)]="processedContentSearchQuery"
                  placeholder="Search processed content..."
                  class="search-input" />
                <button class="btn-primary" (click)="searchProcessedContent()">Search</button>
                <button class="btn-secondary" *ngIf="processedContentSearchActive || processedContentSearchQuery" (click)="clearProcessedContentSearch()">Clear</button>
              </div>
              <p class="hint" *ngIf="!processedContentSearchActive">Showing processed content linked to this lesson.</p>
              <p class="hint" *ngIf="processedContentSearchActive">Showing account-wide processed content results.</p>
            </div>

            <div *ngIf="isProcessedContentSearching" class="loading-state">
              <p>Searching processed content...</p>
            </div>

            <div class="content-list" *ngIf="!isProcessedContentSearching && processedContentPickerList.length > 0">
              <div *ngFor="let content of processedContentPickerList" class="content-card">
                <div class="content-info">
                  <h4>{{content.title || content.workflowName || 'Processed Output'}}</h4>
                  <p class="content-summary">
                    {{content.description || content.contentSource?.summary || 'Processed interaction data'}}
                  </p>
                  <div class="content-meta">
                    <span class="type-badge">{{content.type || 'interaction'}}</span>
                    <span class="source-link-inline" *ngIf="content.contentSource?.title">
                      Source: {{content.contentSource?.title}}
                    </span>
                  </div>
                </div>
                <div class="content-actions">
                  <button class="btn-primary btn-small" (click)="selectProcessedContentItem(content)">Select</button>
                </div>
              </div>
            </div>

            <p class="empty-state" *ngIf="!isProcessedContentSearching && processedContentPickerList.length === 0">
              No processed content found.
            </p>
          </div>
        </div>
      </div>

      <!-- Interaction Configuration Modal (Reusable Component) -->
      <app-interaction-configure-modal
        [isOpen]="showInteractionConfigModal"
        [interactionType]="getSelectedSubStage()?.interaction?.type || ''"
        [interactionName]="currentInteractionType?.name || 'Interaction'"
        [configSchema]="currentInteractionType?.configSchema"
        [sampleData]="interactionPreviewData"
        [initialConfig]="interactionConfig"
        [interactionCategory]="currentInteractionType?.interactionTypeCategory || ''"
        [htmlCode]="currentInteractionType?.htmlCode || ''"
        [cssCode]="currentInteractionType?.cssCode || ''"
        [jsCode]="currentInteractionType?.jsCode || ''"
        [lessonId]="lesson?.id"
        [selectedContentOutputName]="getInteractionProcessedContentLabel()"
        [interactionWidgets]="currentInteractionType?.widgets?.instances || []"
        (closed)="closeInteractionConfigModal()"
        (saved)="saveInteractionConfig($event)"
        (processedContentSelect)="openProcessedContentPicker('interaction')">
      </app-interaction-configure-modal>
      
      <!-- View Changes Modal -->
      <div *ngIf="showViewChangesModal" class="modal-overlay" (click)="closeViewChangesModal()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; align-items: center; justify-content: center;">
        <div class="modal-content" (click)="$event.stopPropagation()" style="background: #1a1a1a; border-radius: 8px; max-width: 900px; max-height: 90vh; overflow-y: auto; width: 90%; border: 1px solid #333;">
          <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; color: white;">Changes for: {{viewChangesDiff?.lessonTitle || lesson?.title}}</h2>
            <button (click)="closeViewChangesModal()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer;">✕</button>
          </div>
          
          <div class="modal-body" *ngIf="viewChangesDiff" style="padding: 1.5rem;">
            <div *ngIf="loadingViewChanges" style="text-align: center; padding: 3rem; color: #999;">
              <div style="border: 3px solid #333; border-top-color: #00d4ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
              <p>Loading changes...</p>
            </div>

            <div *ngIf="!loadingViewChanges && viewChangesDiff.changes.length === 0" style="text-align: center; padding: 3rem; color: #999;">
              <p>No changes detected</p>
            </div>

            <div *ngIf="!loadingViewChanges && viewChangesDiff.changes.length > 0">
              <!-- Grouped by category -->
              <div *ngFor="let group of viewChangeGroups" style="margin-bottom: 1.5rem; border: 1px solid #333; border-radius: 6px; overflow: hidden;">
                <div (click)="toggleViewChangeGroup(group)" style="padding: 1rem; background: #2a2a2a; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>{{group.expanded ? '▼' : '▶'}}</span>
                    <span style="color: white; font-weight: 600;">{{group.label}}</span>
                    <span style="color: #999;">({{group.changes.length}})</span>
                  </div>
                </div>
                <div *ngIf="group.expanded" style="padding: 1rem; background: #0f0f0f;">
                  <div *ngFor="let change of group.changes" style="margin-bottom: 1rem; padding: 1rem; background: #1a1a1a; border-radius: 4px; border: 1px solid #2a2a2a;">
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <span style="background: #2a2a2a; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 11px; color: #999;">{{getChangeCategoryLabel(change.category)}}</span>
                      <span style="color: white; font-weight: 500;">{{change.field}}</span>
                    </div>
                    <div *ngIf="change.description" style="color: #999; font-size: 13px; margin-bottom: 0.5rem;">
                      {{change.description}}
                    </div>
                    <div style="display: flex; gap: 1rem; align-items: center;">
                      <div *ngIf="change.from !== null && change.from !== undefined" style="flex: 1;">
                        <div style="color: #999; font-size: 12px; margin-bottom: 0.25rem;">Before:</div>
                        <div style="color: #ff6b6b; font-size: 13px; word-break: break-word;">{{formatChangeValue(change.from)}}</div>
                      </div>
                      <div *ngIf="change.from !== null && change.from !== undefined" style="color: #666;">→</div>
                      <div style="flex: 1;">
                        <div style="color: #999; font-size: 12px; margin-bottom: 0.25rem;">{{change.from !== null && change.from !== undefined ? 'After' : 'New'}}:</div>
                        <div style="color: #51cf66; font-size: 13px; word-break: break-word;">
                          {{formatChangeValue(change.to)}}
                          <a *ngIf="change.fileUrl" [href]="change.fileUrl" target="_blank" style="color: #00d4ff; margin-left: 0.5rem;">📄 View File</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      padding-top: 64px; /* Space for fixed header on mobile */
    }
    @media (min-width: 768px) {
      :host {
        padding-top: 80px; /* Space for fixed header on desktop */
      }
    }
    
    .lesson-editor-v2 {
      height: 100%;
      background: #0a0a0a;
      color: #e5e5e5;
      display: flex;
      flex-direction: column;
    }

    /* HEADER */
    .editor-header {
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-title h1 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
    }
    .header-title .subtitle {
      font-size: 0.875rem;
      color: #999;
      margin: 0;
    }
    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* EDITOR LAYOUT */
    .editor-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* SIDEBAR */
    .structure-sidebar {
      background: #141414;
      border-right: 1px solid #333;
      display: flex;
      flex-direction: column;
      transition: none; /* Disable transition for smooth resize */
      overflow: hidden;
      position: relative;
    }
    .structure-sidebar.collapsed {
      width: 60px !important;
    }
    .sidebar-header {
      padding: 1rem;
      border-bottom: 1px solid #333;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sidebar-header h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    .sidebar-collapsed-content {
      padding: 1rem 0.5rem;
      display: flex;
      justify-content: center;
    }
    .sidebar-resize-handle {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: transparent;
      cursor: ew-resize;
      transition: background 0.2s;
      z-index: 10;
    }
    .sidebar-resize-handle:hover {
      background: #cc0000;
    }
    .sidebar-resize-handle:active {
      background: #ff0000;
    }

    /* TREE */
    .tree-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      border-radius: 6px;
      cursor: move;
      transition: background 0.2s;
      position: relative;
    }
    .tree-item:hover {
      background: #222;
    }
    .tree-item.selected {
      background: #cc0000;
      color: white;
    }
    .tree-item.drag-over {
      background: #1a1a1a;
      border: 2px dashed #cc0000;
      padding: 0.525rem 0.65rem; /* Adjust for border */
    }
    .drag-handle {
      color: #666;
      font-size: 0.75rem;
      cursor: grab;
      user-select: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .tree-item:hover .drag-handle {
      opacity: 1;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .tree-item .item-icon {
      flex-shrink: 0;
    }
    .tree-item .item-label {
      flex: 1;
      font-size: 0.875rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tree-item .delete-btn {
      opacity: 0;
      background: none;
      border: none;
      padding: 0.25rem;
      color: #999;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .tree-item:hover .delete-btn {
      opacity: 1;
    }
    .tree-item .delete-btn:hover {
      color: #cc0000;
    }
    .expand-btn {
      background: none;
      border: none;
      padding: 0;
      color: #999;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    .expand-btn:hover {
      color: white;
    }
    .substage-list {
      padding-left: 2rem;
      margin-top: 0.5rem;
    }
    .substage-item {
      margin-bottom: 0.25rem;
    }
    .add-item-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.75rem;
      background: #222;
      border: 1px dashed #444;
      border-radius: 6px;
      color: #999;
      cursor: pointer;
      font-size: 0.875rem;
      width: 100%;
      margin-top: 0.5rem;
      transition: all 0.2s;
    }
    .add-item-btn:hover {
      background: #333;
      border-color: #cc0000;
      color: white;
    }
    .add-item-btn.primary {
      border-style: solid;
      background: #1a1a1a;
    }

    /* MAIN CONTENT */
    .editor-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* TABS */
    .tab-nav {
      display: flex;
      gap: 0.25rem;
      background: #141414;
      border-bottom: 1px solid #333;
      padding: 0.5rem 1rem 0;
      overflow-x: auto;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      color: #999;
      cursor: pointer;
      font-size: 0.875rem;
      white-space: nowrap;
      transition: all 0.2s;
      position: relative;
    }
    .tab-btn:hover {
      color: white;
      background: rgba(255,255,255,0.05);
    }
    .tab-btn.active {
      color: white;
      border-bottom-color: #cc0000;
    }
    .tab-icon {
      font-size: 1.125rem;
    }
    .tab-badge {
      background: #cc0000;
      color: white;
      font-size: 0.75rem;
      padding: 0.125rem 0.5rem;
      border-radius: 12px;
      font-weight: 600;
    }

    /* TAB CONTENT */
    .tab-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .panel {
      padding: 2rem;
      max-width: 1200px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    /* Mobile: Add bottom padding to prevent FAB overlap */
    @media (max-width: 1024px) {
      .panel {
        padding-bottom: 10rem; /* Space for FAB + bottom nav */
      }
    }
    .panel-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
    }
    .panel-description {
      color: #999;
      margin: 0 0 2rem;
    }

    /* FORMS */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-group.full-width {
      grid-column: 1 / -1;
    }
    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #ccc;
    }
    .form-group input,
    .form-group select,
    .form-group textarea {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #cc0000;
    }
    .hint {
      font-size: 0.75rem;
      color: #777;
    }
    .error-hint {
      font-size: 0.75rem;
      color: #ff6b6b;
    }

    /* LEARNING OBJECTIVES & OUTCOMES */
    .form-section {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #333;
    }
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #fff;
      margin: 0 0 0.5rem;
    }
    .section-description {
      font-size: 0.875rem;
      color: #999;
      margin: 0 0 1rem;
    }
    .objectives-list,
    .outcomes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .objective-item {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .objective-input {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }
    .objective-input:focus {
      outline: none;
      border-color: #cc0000;
    }
    .outcome-item {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .outcome-header {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .outcome-title-input {
      flex: 1;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      transition: border-color 0.2s;
    }
    .outcome-title-input:focus {
      outline: none;
      border-color: #cc0000;
    }
    .outcome-content-input {
      width: 100%;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
      resize: vertical;
      min-height: 80px;
      transition: border-color 0.2s;
    }
    .outcome-content-input:focus {
      outline: none;
      border-color: #cc0000;
    }
    .btn-icon-small {
      background: transparent;
      border: 1px solid #444;
      border-radius: 6px;
      padding: 0.5rem;
      color: #999;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .btn-icon-small:hover {
      background: #1a1a1a;
      border-color: #cc0000;
      color: #fff;
    }

    /* CARDS */
    .info-card,
    .config-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .info-card h3,
    .config-card h3 {
      font-size: 1.125rem;
      margin: 0 0 1rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .stat {
      text-align: center;
    }
    .stat-label {
      display: block;
      font-size: 0.75rem;
      color: #777;
      margin-bottom: 0.25rem;
    }
    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: 600;
      color: #cc0000;
    }
    .config-value {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #0a0a0a;
      border-radius: 6px;
      margin-top: 0.5rem;
    }
    .config-value .value {
      flex: 1;
    }

    /* SCRIPT EDITOR */
    .script-editor {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .script-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .script-header h3 {
      margin: 0;
      font-size: 1.125rem;
    }
    .timeline {
      margin-top: 1.5rem;
    }
    .timeline-ruler {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 2px solid #333;
      margin-bottom: 1rem;
    }
    .time-marker {
      font-size: 0.75rem;
      color: #777;
    }
    .script-blocks {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .script-block {
      background: #0a0a0a;
      border: 1px solid #333;
      border-left: 4px solid #777;
      border-radius: 6px;
      padding: 1rem;
    }
    .script-block.teacher-talk {
      border-left-color: #3b82f6;
    }
    .script-block.load-interaction {
      border-left-color: #10b981;
    }
    .script-block.pause {
      border-left-color: #f59e0b;
    }
    .block-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .block-header:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .collapse-toggle {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.25rem;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }
    .collapse-toggle:hover {
      color: #fff;
    }
    .block-type-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #ccc;
      flex: 1;
    }
    .block-time-display {
      font-size: 0.875rem;
      color: #999;
      font-family: monospace;
    }
    .block-content {
      margin-top: 0.75rem;
    }
    .script-block.collapsed {
      padding: 0.5rem 1rem;
    }
    .script-block.collapsed .block-header {
      margin-bottom: 0;
    }
    .block-type-select {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 0.5rem;
      color: white;
      font-size: 0.875rem;
    }
    .block-time {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .block-time input {
      width: 80px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 0.5rem;
      color: white;
      text-align: center;
      font-size: 0.875rem;
    }
    .interaction-selector {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
    }
    .interaction-selector label {
      font-size: 0.875rem;
      color: #999;
      font-weight: 500;
    }
    .interaction-display {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .interaction-badge {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      color: #00d4ff;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      flex: 1;
    }
    .interaction-preview {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(0, 212, 255, 0.05);
      border-radius: 4px;
    }
    .interaction-preview small {
      color: #999;
      font-size: 0.75rem;
    }
    .interaction-warning {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(220, 38, 38, 0.4);
      background: rgba(220, 38, 38, 0.08);
      color: #ffb4b4;
    }
    .interaction-warning h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      color: #ffe1e1;
    }
    .warning-icon {
      font-size: 1.75rem;
    }
    .preview-loading {
      text-align: center;
      padding: 2rem 1rem;
      color: #bbb;
    }
    .interaction-selector select {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 0.5rem;
      color: white;
      font-size: 0.875rem;
    }
    .interaction-selector select:focus {
      outline: none;
      border-color: #cc0000;
    }
    .time-display {
      font-size: 0.75rem;
      color: #777;
      margin-left: 0.5rem;
    }
    .script-block textarea {
      width: 100%;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
      resize: vertical;
    }
    .script-block-config {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .script-block-config .config-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .script-block-config .config-section label {
      font-size: 0.875rem;
      color: #ccc;
      font-weight: 500;
    }
    .script-block-config .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .script-block-config .checkbox-label input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #cc0000;
    }
    .script-block-config .checkbox-label span {
      color: #ccc;
      font-size: 0.875rem;
    }
    .snack-duration-input {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .snack-duration-field {
      width: 100px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 4px;
      padding: 0.5rem;
      color: white;
      font-size: 0.875rem;
      text-align: center;
    }
    .snack-duration-field:focus {
      outline: none;
      border-color: #cc0000;
    }
    .snack-duration-field::placeholder {
      color: #666;
    }
    .duration-unit {
      color: #999;
      font-size: 0.875rem;
    }

    /* BUTTONS */
    .btn-icon {
      background: none;
      border: none;
      padding: 0.5rem;
      color: #999;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .btn-icon:hover {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    .btn-primary {
      background: #cc0000;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-primary:hover:not(:disabled) {
      background: #b30000;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #1a1a1a;
      color: white;
      border: 1px solid #333;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-secondary:hover:not(:disabled) {
      background: #222;
      border-color: #cc0000;
    }
    .btn-small {
      background: #1a1a1a;
      color: white;
      border: 1px solid #333;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-small:hover {
      background: #222;
      border-color: #cc0000;
    }

    .btn-danger {
      background: #cc0000;
      color: white;
    }

    .btn-danger:hover {
      background: #ff0000;
    }

    /* EMPTY STATES */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #777;
      font-style: italic;
    }

    .empty-state-small {
      text-align: center;
      padding: 1.5rem 1rem;
      color: #777;
      font-style: italic;
      font-size: 14px;
    }

    .content-section {
      margin-bottom: 2rem;
      background: #1a1a1a;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #333;
    }

    .search-section {
      margin-bottom: 1.5rem;
      background: #111;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
    }

    .search-bar {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .search-input {
      flex: 1;
      min-width: 220px;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.6rem 0.85rem;
      color: white;
    }

    .search-input:focus {
      outline: none;
      border-color: #dc2626;
    }

    .loading-state {
      text-align: center;
      padding: 1rem;
      color: #bbb;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-header h3 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .content-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .content-card {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #0f0f0f;
      border: 1px solid #333;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .content-card:hover {
      border-color: #dc2626;
      background: #151515;
    }

    .content-icon {
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
    }

    .content-info {
      flex: 1;
      min-width: 0;
    }

    .content-info h4 {
      color: white;
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 0.25rem 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .content-summary {
      color: #999;
      font-size: 12px;
      margin: 0 0 0.5rem 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .content-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .type-badge {
      background: #333;
      color: #aaa;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .auto-gen-badge {
      background: #1e3a8a;
      color: #93c5fd;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }

    .source-link-inline {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #999;
    }

    .source-link-inline small {
      font-size: 11px;
    }

    .content-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .btn-sm {
      padding: 0.4rem 0.8rem;
      font-size: 13px;
    }

    /* MOBILE */
    @media (max-width: 1024px) {
      /* Show/hide based on viewport */
      .desktop-only {
        display: none !important;
      }
      .mobile-only {
        display: inline !important;
      }
      .desktop-full {
        padding: 0.5rem !important;
        min-width: auto !important;
      }
      .mobile-icon {
        width: 40px;
        height: 40px;
        padding: 0.5rem !important;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tab-nav {
        display: none; /* Hide desktop tabs */
      }
      .header-title h1 {
        font-size: 0.9rem;
      }
      .header-title .subtitle {
        display: none; /* Hide subtitle on mobile for space */
      }
      .header-actions {
        gap: 0.375rem !important; /* Tighter spacing on mobile */
      }
      .header-actions .btn-icon,
      .header-actions .btn-secondary,
      .header-actions .btn-primary {
        width: 36px !important;
        height: 36px !important;
        min-width: 36px !important;
        padding: 0.375rem !important;
        font-size: 14px !important;
      }
      
      /* Form improvements for mobile */
      .form-group label {
        font-size: 0.9375rem !important; /* Slightly larger for readability */
      }
      .form-group input,
      .form-group select,
      .form-group textarea {
        font-size: 1rem !important; /* Prevent zoom on iOS */
        padding: 0.875rem !important;
        min-height: 44px; /* Touch-friendly height */
      }
      .form-group input[type="url"],
      .form-group input[type="text"] {
        word-break: break-all; /* Allow URL wrapping */
        overflow-x: auto;
      }
      .hint {
        font-size: 0.8125rem !important;
      }
      
      /* Card text improvements */
      .info-card p,
      .config-card p,
      .panel-description {
        font-size: 0.9375rem !important;
        line-height: 1.6;
      }
      .tree-item-label {
        font-size: 0.9375rem !important;
      }
      
      /* Sidebar - completely hidden when not open */
      .structure-sidebar {
        position: fixed;
        left: 0;
        top: 64px;
        bottom: 0;
        z-index: 100;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        width: 320px !important; /* Force width on mobile */
      }
      .structure-sidebar.collapsed {
        transform: translateX(-100%); /* Completely hidden */
        width: 0 !important;
      }
      .structure-sidebar.mobile-open {
        transform: translateX(0);
      }
      .sidebar-collapsed-content {
        display: none !important; /* Hide burger icon when collapsed */
      }
      .sidebar-resize-handle {
        display: none !important; /* Hide resize handle on mobile */
      }
      
      /* Overlay */
      .mobile-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 99;
      }
      
      /* FAB */
      .mobile-fab {
        position: fixed;
        bottom: 5.5rem; /* Above mobile bottom bar */
        right: 1rem;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #cc0000;
        color: white;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        cursor: pointer;
        z-index: 50;
      }
      .mobile-fab svg {
        width: 24px;
        height: 24px;
      }
      
      /* Mobile Bottom Bar */
      .mobile-bottom-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #1a1a1a;
        border-top: 1px solid #333;
        display: flex;
        justify-content: space-evenly; /* Distribute evenly, no scroll */
        padding: 0.5rem 0;
        z-index: 200;
      }
      .mobile-tab-btn {
        background: none;
        border: none;
        padding: 0.75rem 0.25rem;
        color: #999;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        flex: 1; /* Equal width for all tabs - no scrolling! */
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 0; /* Allow shrinking below content size */
      }
      .mobile-tab-btn.active {
        color: white;
        border-bottom-color: #cc0000;
        background: rgba(204, 0, 0, 0.1);
      }
      .mobile-tab-btn .tab-icon {
        font-size: 1.25rem;
      }
      @media (max-width: 380px) {
        .mobile-tab-btn .tab-icon {
          font-size: 1.125rem; /* Slightly smaller on very small screens */
        }
      }
      
      /* Modal improvements for mobile */
      .modal-overlay {
        padding: 0 !important;
      }
      .modal-content {
        width: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        height: 100% !important;
        border-radius: 0 !important;
      }
      .modal-body {
        max-height: none !important;
        flex: 1;
        overflow-y: auto;
      }
      
      /* Config card improvements */
      .config-card,
      .info-card {
        padding: 1rem !important;
        margin-bottom: 1rem !important;
      }
      .config-card h3,
      .info-card h3 {
        font-size: 1rem !important;
      }
      
      /* Interaction config modal */
      .interaction-config-modal .modal-content {
        padding: 0;
      }
      .modal-tabs {
        flex-wrap: nowrap;
        overflow-x: auto;
      }
      .modal-tab-btn {
        flex-shrink: 0;
        min-width: 100px;
      }
      
      /* Button improvements */
      .btn-small,
      .btn-secondary,
      .btn-primary {
        min-height: 44px !important;
        padding: 0.75rem 1rem !important;
        font-size: 0.9375rem !important;
      }
      
      /* Interaction display and actions - prevent overflow */
      .interaction-display {
        flex-wrap: wrap !important;
        gap: 0.5rem !important;
      }
      .interaction-badge {
        flex: 1 1 100% !important; /* Full width on mobile */
        min-width: 0 !important;
        word-break: break-word;
      }
      .interaction-actions {
        flex-wrap: wrap !important;
        gap: 0.5rem !important;
        width: 100%;
      }
      .interaction-actions button {
        flex: 1 1 calc(50% - 0.25rem) !important; /* Two buttons per row */
        min-width: 0 !important;
        font-size: 0.875rem !important;
        padding: 0.625rem 0.75rem !important;
      }
      
      /* Script block interaction selector */
      .interaction-selector {
        padding: 0.75rem !important;
      }
      .interaction-selector .interaction-display {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      
      /* Config value sections (Structure tab) */
      .config-value {
        flex-wrap: wrap !important;
        gap: 0.5rem !important;
      }
      .config-value .value {
        flex: 1 1 100% !important;
        word-break: break-word;
      }
      .config-value button,
      .content-config button,
      .interaction-config button {
        flex: 1 1 calc(50% - 0.25rem) !important;
        min-width: 0 !important;
      }
    }
    @media (min-width: 1025px) {
      .mobile-fab {
        display: none;
      }
      .mobile-bottom-bar {
        display: none;
      }
      .mobile-only {
        display: none !important;
      }
    }

    /* CONTENT PANEL */
    .content-workflow {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .content-workflow h3 {
      margin: 0 0 1.5rem;
      font-size: 1.25rem;
    }
    .workflow-section {
      margin-bottom: 1.5rem;
    }
    .workflow-section.separator {
      border-top: 1px solid #333;
      padding-top: 1.5rem;
    }
    .workflow-section .section-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 0.75rem 0;
    }
    .content-workflow button {
      margin-right: 0.75rem;
      margin-bottom: 0.75rem;
    }
    .processed-outputs {
      margin-top: 2rem;
    }
    .processed-outputs h3 {
      margin-bottom: 1rem;
    }
    .output-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .output-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1rem;
    }
    .output-card-compact {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .output-header-compact {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }
    .output-title-section {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .output-name {
      font-weight: 500;
    }
    .output-name-compact {
      font-weight: 500;
      font-size: 0.875rem;
    }
    .output-type {
      background: #333;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .output-type-compact {
      background: #333;
      padding: 0.125rem 0.375rem;
      border-radius: 4px;
      font-size: 0.7rem;
      color: #aaa;
    }
    .source-link {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7rem;
      color: #666;
      padding: 4px 8px;
      background: rgba(59,130,246,0.1);
      border-radius: 4px;
      border-left: 2px solid rgba(59,130,246,0.5);
    }
    .source-link .link-icon {
      flex-shrink: 0;
      stroke: #60a5fa;
    }
    .source-link small {
      color: #93c5fd;
      font-weight: 500;
    }
    .output-workflow {
      font-size: 0.875rem;
      color: #777;
      margin: 0 0 1rem;
    }
    .output-actions {
      display: flex;
      gap: 0.5rem;
    }
    .output-actions-compact {
      display: flex;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    /* PREVIEW PANEL */
    .preview-container {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .preview-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #333;
    }
    .timeline-scrubber {
      flex: 1;
    }
    .timeline-scrubber input[type="range"] {
      width: 100%;
    }
    .student-view {
      min-height: 400px;
    }
    .ai-teacher-message {
      display: flex;
      gap: 1rem;
      background: #0a0a0a;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }
    .ai-teacher-message .avatar {
      font-size: 2rem;
    }
    .interaction-preview {
      background: #0a0a0a;
      border: 1px dashed #333;
      border-radius: 8px;
      padding: 3rem;
      text-align: center;
      color: #777;
    }

    /* AI PANEL */
    .ai-panel-wrapper {
      padding: 0 !important;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-width: 100%;
    }
    .ai-panel-header {
      padding: 2rem 2rem 1rem;
      flex-shrink: 0;
    }
    .ai-context {
      background: #1a1a1a;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-top: 1rem;
      font-size: 0.875rem;
    }
    .ai-chat-scrollable {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0 2rem 1rem;
      min-height: 0; /* Important for flexbox scrolling */
    }
    .chat-messages {
      min-height: 200px;
    }
    .chat-message {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .chat-message .avatar {
      font-size: 1.5rem;
      flex-shrink: 0;
    }
    .chat-message p {
      background: #0a0a0a;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin: 0;
    }
    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .quick-action-btn {
      background: #0a0a0a;
      border: 1px solid #333;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .quick-action-btn:hover {
      background: #222;
      border-color: #cc0000;
    }
    .ai-chat-input-sticky {
      flex-shrink: 0;
      background: #0a0a0a;
      border-top: 1px solid #333;
      padding: 1rem 2rem;
      z-index: 10;
    }
    .chat-input {
      display: flex;
      gap: 0.75rem;
    }
    .chat-input input {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
    }
    .chat-input input:focus {
      outline: none;
      border-color: #cc0000;
      box-shadow: 0 0 0 2px rgba(204, 0, 0, 0.1);
    }
    @media (max-width: 1024px) {
      .ai-chat-input-sticky {
        padding: 0.75rem 1rem 0.75rem;
        position: fixed;
        bottom: 62px; /* Sits directly above mobile bottom bar (60px + 2px border) */
        left: 0;
        right: 0;
        background: #0a0a0a;
        border-top: 1px solid #333;
        z-index: 150;
      }
      .ai-chat-scrollable {
        padding-bottom: 140px; /* Space for fixed input + bottom bar */
      }
    }

    .full-width {
      width: 100%;
    }
    .mt-4 {
      margin-top: 1rem;
    }

    /* SNACKBAR */
    .snackbar {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #1a1a1a;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      border: 1px solid #333;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      z-index: 10000;
      transition: transform 0.3s ease, opacity 0.3s ease;
      font-size: 0.875rem;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
    }
    .snackbar.visible {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .snackbar.success {
      background: #22c55e;
      border-color: #16a34a;
      color: white;
    }
    .snackbar.error {
      background: #ef4444;
      border-color: #dc2626;
      color: white;
    }
    .snackbar.info {
      background: #00d4ff;
      border-color: #00b8e6;
      color: #0a0a0a;
    }
    @media (max-width: 1024px) {
      .snackbar {
        bottom: 5rem; /* Above mobile bottom bar */
      }
    }

    /* BUTTON STATES */
    .btn-secondary.saved,
    .btn-primary.submitted {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* PROCESSED CONTENT MODAL */
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
      z-index: 9999999;
      padding: 20px;
    }

    .modal-content {
      background: #1f2937;
      border-radius: 16px;
      max-width: 800px;
      max-height: 80vh;
      width: 90%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }

    .modal-header h2 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
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
      padding: 24px;
      overflow-y: auto;
      max-height: 60vh;
    }

    .content-details {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .content-header h3 {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .content-meta {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .content-type {
      background: rgba(59,130,246,0.2);
      color: #60a5fa;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .content-status {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }

    .content-status.status-ready {
      background: rgba(16,185,129,0.2);
      color: #10b981;
    }

    .content-status.status-processing {
      background: rgba(251,191,36,0.2);
      color: #fbbf24;
    }

    .content-status.status-error {
      background: rgba(239,68,68,0.2);
      color: #ef4444;
    }

    .content-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-item label {
      color: #9ca3af;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item span {
      color: white;
      font-size: 14px;
    }

    .content-description h4,
    .content-transcript h4,
    .content-thumbnail h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }

    .content-description p {
      color: #d1d5db;
      line-height: 1.6;
      margin: 0;
    }

    .transcript-content {
      background: #111827;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #374151;
    }

    .transcript-content p {
      color: #d1d5db;
      line-height: 1.6;
      margin: 0;
    }

    .thumbnail {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }

    /* Fullscreen Modal Styles */
    .warning-modal {
      max-width: 500px;
    }

    .warning-modal .modal-header h2 {
      color: #ff6b6b;
      margin: 0;
    }

    .warning-modal .modal-body {
      padding: 24px;
    }

    .warning-modal .modal-body p {
      margin: 12px 0;
      line-height: 1.6;
    }

    .warning-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .modal-overlay-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }

    .modal-container-fullscreen {
      background: #1f2937;
      border-radius: 12px;
      width: calc(100% - 16px);
      max-width: 900px;
      height: calc(100vh - 16px);
      max-height: 900px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header-sticky {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: #1f2937;
    }

    .modal-header-sticky h2 {
      color: white;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }

    .modal-tabs {
      display: flex;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: #1a1a1a;
    }

    .modal-tab {
      flex: 1;
      padding: 12px 16px;
      background: none;
      border: none;
      color: #999;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 2px solid transparent;
    }

    .modal-tab:hover {
      color: white;
      background: rgba(255, 255, 255, 0.05);
    }

    .modal-tab.active {
      color: white;
      border-bottom-color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .modal-body-scrollable {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .preview-tab-content {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .interaction-preview-fullscreen {
      flex: 1;
      background: #0f0f0f;
      border-radius: 8px;
      border: 1px solid #333;
      padding: 2rem;
      min-height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-placeholder {
      color: #666;
      font-style: italic;
      text-align: center;
    }

    .preview-content {
      width: 100%;
    }

    .preview-content h3 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 1.5rem 0;
    }

    .preview-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 2rem;
    }

    .interaction-title {
      color: white;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 1rem 0;
      text-align: center;
    }

    .interaction-instructions {
      color: #d1d5db;
      font-size: 16px;
      text-align: center;
      margin: 0 0 2rem 0;
      line-height: 1.6;
    }

    .preview-note-box {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
      padding: 1rem;
      margin-top: 2rem;
    }

    .preview-note-box p {
      color: #93c5fd;
      font-size: 13px;
      margin: 0.5rem 0;
    }

    .preview-note-box p:first-child {
      margin-top: 0;
    }

    .preview-note-box p:last-child {
      margin-bottom: 0;
    }

    .preview-loading {
      color: #999;
      text-align: center;
      padding: 2rem;
    }

    .preview-loading p {
      margin: 0;
      font-size: 14px;
    }

    .modal-footer-sticky {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background: #1f2937;
    }

    .config-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .config-section h3 {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .preview-section {
      margin-top: 2rem;
      padding: 1.5rem;
      background: #111827;
      border-radius: 8px;
      border: 1px solid #374151;
    }

    .preview-section h4 {
      color: white;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 1rem 0;
    }

    .interaction-preview-box {
      background: #0f0f0f;
      padding: 1.5rem;
      border-radius: 6px;
      border: 1px solid #333;
    }

    .interaction-preview-box p {
      color: #d1d5db;
      margin: 0.5rem 0;
      font-size: 14px;
    }

    .preview-note {
      color: #999 !important;
      font-style: italic;
      margin-top: 1rem !important;
    }

    .interaction-actions {
      display: flex;
      gap: 0.5rem;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      background: #0f0f0f;
      border: 1px solid #333;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      font-family: inherit;
    }

    .form-input:focus {
      outline: none;
      border-color: #dc2626;
    }

    .json-editor {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }

    .readonly-value {
      color: #999;
      font-size: 14px;
      padding: 0.75rem;
      background: #0a0a0a;
      border-radius: 6px;
      margin: 0;
    }

    .info-note {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 1rem;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 6px;
    }

    .info-note span {
      font-size: 20px;
    }

    .info-note p {
      color: #93c5fd;
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }
  `]
})
export class LessonEditorV2Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  lesson: Lesson | null = null;
  isNewLesson: boolean = false;
  saving: boolean = false;
  hasUnsavedChanges: boolean = false;
  hasBeenSubmitted: boolean = false;
  hasDraft: boolean = false;
  hasPendingDraft: boolean = false;
  hasContentChanges: boolean = false; // Track if draft has content changes requiring approval
  showingPendingChanges: boolean = false;
  pendingDraftData: any = null;
  liveLessonData: any = null;
  lastSaved: Date | null = null;
  showPendingChangesWarning: boolean = false;
  pendingWarningAction: 'save' | 'submit' | null = null;
  currentDraftId: string | number | null = null; // Track the ID of the draft we just saved
  olderDraftIds: (string | number)[] = []; // Track older draft IDs to discard if needed
  
  // Snackbar state
  snackbarMessage: string = '';
  snackbarVisible: boolean = false;
  snackbarType: 'success' | 'error' | 'info' = 'info';
  private snackbarTimeout: any = null;
  
  // UI State
  private _activeTab: EditorTab = 'details';
  get activeTab(): EditorTab {
    return this._activeTab;
  }
  set activeTab(value: EditorTab) {
    this._activeTab = value;
    // Save to localStorage
    this.saveSelectionToStorage();
    // Load preview data when switching to preview tab
    if (value === 'preview') {
      this.ensurePreviewDataLoaded();
    }
  }
  sidebarCollapsed: boolean = false;
  mobileSidebarOpen: boolean = false;
  sidebarWidth: number = 320;
  isResizingSidebar: boolean = false;
  
  // Drag and drop state
  draggedStage: Stage | null = null;
  draggedSubStage: {substage: SubStage, stageId: string} | null = null;
  dragOverStageId: string | null = null;
  dragOverSubStageId: string | null = null;
  draggedScriptBlockIndex: number | null = null;
  dragOverScriptBlockIndex: number | null = null;
  collapsedScriptBlocks: Set<string> = new Set(); // Track which script blocks are collapsed (by block.id)
  private isTogglingBlock: string | null = null; // Prevent multiple simultaneous toggles
  
  // View Changes Modal
  showViewChangesModal: boolean = false;
  viewChangesDiff: any = null;
  loadingViewChanges: boolean = false;
  viewChangeGroups: any[] = [];
  
  // Lesson Structure
  stages: Stage[] = [];
  
  // Selection
  
  selectedItem: {type: 'lesson' | 'stage' | 'substage', id: string, stageId?: string} = {
    type: 'lesson',
    id: ''
  };
  
  // Processed Outputs
  processedOutputs: ProcessedContentOutput[] = [];
  
  // Tags
  tagsString: string = '';
  
  // Learning Objectives
  learningObjectives: string[] = [];
  
  // Lesson Outcomes
  lessonOutcomes: Array<{ title: string; content: string }> = [];
  
  // AI Chat
  aiChatInput: string = '';
  
  // Modal State
  showContentProcessor: boolean = false;
  showApprovalQueue: boolean = false;
  showContentLibrary: boolean = false;
  showTextModal: boolean = false;
  showImageModal: boolean = false;
  showPdfModal: boolean = false;
  contentProcessorVideoId?: string;
  contentProcessorResumeProcessing: boolean = false;
  showInteractionConfigModal: boolean = false;
  showInteractionTypeModal: boolean = false;
  availableInteractionTypes: any[] = [];
  interactionConfig: any = null;
  interactionConfigTab: 'configure' | 'preview' = 'configure';
  interactionPreviewData: any = null;
  isInteractionPreviewLoading: boolean = false;
  currentInteractionType: any = null;
  showSourceContentModal: boolean = false;
  showSourceContentViewModal: boolean = false;
  selectedSourceContent: any = null;
  viewingSourceContent: any = null;
  showProcessedContentJsonModal: boolean = false;
  selectedProcessedJson: any = null;
  
  // Processed Content
  processedContentItems: ProcessedContentItem[] = [];
  selectedProcessedContent: ProcessedContentItem | null = null;
  showProcessedContentPicker: boolean = false;
  processedContentSelectionContext: 'structure' | 'interaction' = 'structure';
  processedContentSearchQuery: string = '';
  processedContentSearchResults: ProcessedContentItem[] = [];
  processedContentSearchActive: boolean = false;
  isProcessedContentSearching: boolean = false;
  accountProcessedContentItems: ProcessedContentItem[] = [];
  sourceContentItems: any[] = []; // Content sources used in this lesson
  aiMessage: string = '';
  
  // Tab Configuration
  tabs = [
    { id: 'details' as EditorTab, label: 'Details', icon: '📋' },
    { id: 'structure' as EditorTab, label: 'Structure', icon: '🏗️' },
    { id: 'script' as EditorTab, label: 'Script', icon: '📜' },
    { id: 'content' as EditorTab, label: 'Content', icon: '📚', badge: '' },
    { id: 'preview' as EditorTab, label: 'Preview', icon: '🔍' },
    { id: 'ai-assistant' as EditorTab, label: 'AI Assistant', icon: '🤖' }
  ];
  
  // TEACH Stage-SubStage Mapping
  stageSubStageMap: Record<string, string[]> = {
    'tease': ['trigger', 'ignite', 'evoke'], // TIE
    'explore': ['handle', 'uncover', 'noodle', 'track'], // HUNT
    'absorb': ['show', 'interpret', 'parallel'], // SIP
    'cultivate': ['grip', 'repurpose', 'originate', 'work'], // GROW
    'hone': ['verify', 'evaluate', 'target'] // VET
  };
  
  substageTypeLabels: Record<string, string> = {
    // TIE (Tease)
    'trigger': 'Trigger - Provocative question/teaser',
    'ignite': 'Ignite - Surprising visual/demo',
    'evoke': 'Evoke - Personal connection',
    // HUNT (Explore)
    'handle': 'Handle - Interactive manipulation',
    'uncover': 'Uncover - Guided questioning',
    'noodle': 'Noodle - Hypothesis-sharing',
    'track': 'Track - Identify patterns',
    // SIP (Absorb)
    'show': 'Show - Concise explanation/visual',
    'interpret': 'Interpret - Active summarization',
    'parallel': 'Parallel - Analogy/example',
    // GROW (Cultivate)
    'grip': 'Grip - Basic task application',
    'repurpose': 'Repurpose - New context twist',
    'originate': 'Originate - Creative extension',
    'work': 'Work - Revise with feedback',
    // VET (Hone)
    'verify': 'Verify - Quiz/recall',
    'evaluate': 'Evaluate - Self-assess gaps',
    'target': 'Target - Forward-looking action'
  };

  interactionPreviewBlobUrl: SafeResourceUrl | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private contentSourceService: ContentSourceService,
    private processedContentService: ProcessedContentService,
    private cdr: ChangeDetectorRef,
    private domSanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // VERSION CHECK: This log should always appear when new code is loaded
    console.log('🔥🔥🔥 LESSON EDITOR VERSION 0.0.5 - IFRAME GUIDE URL IN PASTE URL MODAL + FIXED TEXT COLOR 🔥🔥🔥');
    console.log('[LessonEditor] 🚀 ngOnInit - NEW CODE LOADED - VERSION 0.0.5');
    console.log('[LessonEditor] ✅ Parses actual DB JSON with scriptBlocks, scriptBlocksAfterInteraction!');
    console.log('[LessonEditor] ✅ Converts DB format to editor format!');
    console.log('[LessonEditor] ✅ Database-first development - no mock data!');
    
    // Reset body overflow when entering page (in case it was left locked)
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
    
    // Add browser-level unsaved changes warning
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Get lesson ID from route
    const lessonId = this.route.snapshot.paramMap.get('id');
    const queryParams = this.route.snapshot.queryParams;
    
    console.log('[LessonEditor] 🚀 ngOnInit - Lesson ID from route:', lessonId);
    console.log('[LessonEditor] 🚀 Query parameters:', queryParams);
    console.log('[LessonEditor] 🚀 Current URL:', window.location.href);
    
    // Check if lessonId contains query parameters (shouldn't happen with proper routing)
    if (lessonId && lessonId.includes('?')) {
      console.warn('[LessonEditor] ⚠️ Lesson ID contains query parameters, extracting clean ID');
      const cleanLessonId = lessonId.split('?')[0];
      console.log('[LessonEditor] 🔧 Using clean lesson ID:', cleanLessonId);
      
      if (cleanLessonId === 'new') {
        console.log('[LessonEditor] 🆕 Creating new lesson');
        this.isNewLesson = true;
        this.initializeNewLesson();
      } else if (cleanLessonId) {
        console.log('[LessonEditor] 📖 Loading existing lesson:', cleanLessonId);
        this.loadLesson(cleanLessonId);
      }
    } else {
      // Normal flow
      if (lessonId === 'new') {
        console.log('[LessonEditor] 🆕 Creating new lesson');
        this.isNewLesson = true;
        this.initializeNewLesson();
      } else if (lessonId) {
        console.log('[LessonEditor] 📖 Loading existing lesson:', lessonId);
        this.loadLesson(lessonId);
      } else {
        console.log('[LessonEditor] ❌ No lesson ID provided');
      }
    }
    
    // Load processed content for this lesson
    this.loadProcessedContent();
    
    // Load linked content sources for this lesson
    this.loadLinkedContentSources();
    
    // Also load processed content from interactions after stages are loaded
    setTimeout(() => {
      this.loadProcessedContentFromInteractions();
    }, 1000);
    
    // Also load processed content from interactions after stages are loaded
    setTimeout(() => {
      this.loadProcessedContentFromInteractions();
    }, 1000);
  }

  /**
   * Initialize a new blank lesson
   */
  initializeNewLesson() {
    console.log('[LessonEditor] 🆕 Initializing new lesson');
    this.lesson = {
      id: '',
      title: 'Untitled Lesson',
      description: '',
      thumbnailUrl: '',
      duration: '0',
      difficulty: 'Beginner',
      tags: [],
      category: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: {
        stages: []
      }
    };
    this.stages = [];
    this.learningObjectives = [];
    this.lessonOutcomes = [];
    this.selectedItem = { type: 'lesson', id: '' };
    console.log('[LessonEditor] ✅ New lesson initialized');
  }

  /**
   * Load an existing lesson from the database
   */
  loadLesson(id: string) {
    console.log('[LessonEditor] 📖 Loading lesson:', id);
    
    // First, check if there's a pending draft for this lesson
    this.http.get<any>(`${environment.apiUrl}/lesson-drafts/lesson/${id}`, {
      headers: {
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId
      }
    })
      .pipe(
        switchMap((draft: any) => {
          // Always load the live lesson first
          return this.http.get<any>(`${environment.apiUrl}/lessons/${id}`, {
            headers: { 'x-tenant-id': environment.tenantId }
          }).pipe(
            map(lesson => {
              // Only treat as pending if status is 'pending' AND has actual changes
              if (draft && draft.status === 'pending' && draft.changesCount && draft.changesCount > 0) {
                console.log('[LessonEditor] 📝 Found pending draft with changes, storing both live and draft data');
                this.hasDraft = true;
                this.hasPendingDraft = true;
                this.pendingDraftData = draft.draftData;
                // Deep clone the live lesson to preserve its structure - CRITICAL!
                this.liveLessonData = JSON.parse(JSON.stringify(lesson));
                // Ensure objectives are included in live lesson data
                if (!this.liveLessonData.objectives && (lesson.objectives || lesson.data?.objectives)) {
                  this.liveLessonData.objectives = lesson.objectives || lesson.data?.objectives || {};
                }
                this.lastSaved = draft.createdAt ? new Date(draft.createdAt) : null;
                this.showingPendingChanges = false; // Start with live lesson
                this.hasBeenSubmitted = false; // Reset submission status when loading
                console.log('[LessonEditor] 🔍 Live lesson data stored (deep cloned):', this.liveLessonData);
                console.log('[LessonEditor] 🔍 Live lesson objectives:', this.liveLessonData.objectives);
                console.log('[LessonEditor] 🔍 Live lesson stages path:', {
                  'data.structure.stages': this.liveLessonData.data?.structure?.stages?.length || 0,
                  'data.stages': this.liveLessonData.data?.stages?.length || 0,
                  'structure.stages': this.liveLessonData.structure?.stages?.length || 0
                });
                return lesson; // Return live lesson initially
              } else {
                // No pending draft, or draft has no changes
                if (draft && draft.status === 'pending' && (!draft.changesCount || draft.changesCount === 0)) {
                  console.log('[LessonEditor] 📖 Found pending draft but it has no changes (changesCount:', draft.changesCount, ')');
                } else {
                  console.log('[LessonEditor] 📖 No pending draft found (draft status:', draft?.status || 'none', ')');
                }
                this.hasPendingDraft = false;
                this.pendingDraftData = null;
                this.liveLessonData = null;
                this.showingPendingChanges = false;
                this.hasBeenSubmitted = false; // Reset submission status when no pending draft
                this.hasDraft = false; // Reset draft status
                this.hasContentChanges = false; // Reset content changes flag
                return lesson;
              }
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (lesson: any) => {
          console.log('[LessonEditor] ✅ Lesson loaded:', lesson);
          console.log('[LessonEditor] 📊 Full lesson.data:', lesson.data);
          this.lesson = lesson;
          
          // If there's a pending draft, use the draft data instead of live lesson data
          let dataToUse = lesson;
          if (this.hasPendingDraft && this.pendingDraftData && !this.showingPendingChanges) {
            console.log('[LessonEditor] 📝 Using pending draft data for initial load');
            // Merge draft data into lesson structure
            dataToUse = {
              ...lesson,
              ...this.pendingDraftData,
              data: {
                ...lesson.data,
                structure: this.pendingDraftData.structure || lesson.data?.structure
              }
            };
          }
          
          // Parse the new JSON structure: lesson.data.structure.stages or lesson.data.stages
          const stagesData = dataToUse.data?.structure?.stages || dataToUse.structure?.stages || dataToUse.data?.stages;
          console.log('[LessonEditor] 📊 Raw stagesData:', stagesData);
          if (stagesData) {
            console.log('[LessonEditor] 📊 Parsing stages from lesson data');
            this.stages = this.parseStagesFromJSON(stagesData);
            console.log('[LessonEditor] ✅ Parsed stages:', this.stages);
            
            // Restore load_interaction blocks from saved data (interaction.config or loadInteractionTiming)
            this.stages.forEach((stage) => {
              stage.subStages.forEach((substage) => {
                if (substage.interaction) {
                  // Check if we have saved timing data for load_interaction block
                  const loadInteractionTiming = (substage as any).loadInteractionTiming;
                  const configTiming = substage.interaction.config;
                  
                  if (loadInteractionTiming || (configTiming && (configTiming.startTime !== undefined || configTiming.endTime !== undefined))) {
                    // Find or create the load_interaction block
                    let loadInteractionBlock = substage.scriptBlocks?.find(b => b.type === 'load_interaction');
                    
                    if (!loadInteractionBlock) {
                      // Create the load_interaction block if it doesn't exist
                      if (!substage.scriptBlocks) {
                        substage.scriptBlocks = [];
                      }
                      loadInteractionBlock = {
                        id: `load-interaction-${substage.id}`,
                        type: 'load_interaction',
                        content: '',
                        startTime: loadInteractionTiming?.startTime || configTiming?.startTime || 0,
                        endTime: loadInteractionTiming?.endTime || configTiming?.endTime || 10,
                        autoProgressAtEnd: loadInteractionTiming?.autoProgressAtEnd !== undefined 
                          ? loadInteractionTiming.autoProgressAtEnd 
                          : (configTiming?.autoProgressAtEnd !== undefined ? configTiming.autoProgressAtEnd : true)
                      };
                      substage.scriptBlocks.push(loadInteractionBlock);
                      console.log('[LessonEditor] ✅ Created load_interaction block from saved timing:', loadInteractionBlock);
                    } else {
                      // Update existing block with saved timing
                      if (loadInteractionTiming) {
                        loadInteractionBlock.startTime = loadInteractionTiming.startTime || loadInteractionBlock.startTime;
                        loadInteractionBlock.endTime = loadInteractionTiming.endTime || loadInteractionBlock.endTime;
                        loadInteractionBlock.autoProgressAtEnd = loadInteractionTiming.autoProgressAtEnd !== undefined 
                          ? loadInteractionTiming.autoProgressAtEnd 
                          : loadInteractionBlock.autoProgressAtEnd;
                      } else if (configTiming) {
                        if (configTiming.startTime !== undefined) loadInteractionBlock.startTime = configTiming.startTime;
                        if (configTiming.endTime !== undefined) loadInteractionBlock.endTime = configTiming.endTime;
                        if (configTiming.autoProgressAtEnd !== undefined) loadInteractionBlock.autoProgressAtEnd = configTiming.autoProgressAtEnd;
                      }
                      console.log('[LessonEditor] ✅ Restored load_interaction block timing:', loadInteractionBlock);
                    }
                  }
                }
              });
            });
            
            // Collapse all script blocks by default and fix any overlapping times
            this.collapsedScriptBlocks.clear();
            let overlapsFixed = false;
            this.stages.forEach((stage, stageIdx) => {
              stage.subStages.forEach((substage, substageIdx) => {
                if (substage.scriptBlocks && substage.scriptBlocks.length > 0) {
                  console.log(`[LessonEditor] 🔍 Checking substage "${substage.title}" (${substage.scriptBlocks.length} blocks)`);
                  // Log blocks before fix
                  substage.scriptBlocks.forEach((block, blockIdx) => {
                    console.log(`[LessonEditor]   Block ${blockIdx}: type=${block.type}, startTime=${block.startTime}, endTime=${block.endTime}, id=${block.id}`);
                  });
                  
                  // Fix any overlapping times for blocks of the same type
                  const hadOverlaps = this.fixScriptBlockOverlaps(substage.scriptBlocks);
                  if (hadOverlaps) {
                    overlapsFixed = true;
                    console.log(`[LessonEditor] ✅ Fixed overlaps in substage "${substage.title}"`);
                    // Log blocks after fix
                    substage.scriptBlocks.forEach((block, blockIdx) => {
                      console.log(`[LessonEditor]   Block ${blockIdx} (after fix): type=${block.type}, startTime=${block.startTime}, endTime=${block.endTime}, id=${block.id}`);
                    });
                  }
                  
                  // Add all block IDs to collapsed set (using actual IDs from blocks array)
                  substage.scriptBlocks.forEach((block) => {
                    if (block && block.id) {
                      this.collapsedScriptBlocks.add(block.id);
                      console.log(`[LessonEditor]   Added block to collapsed set: ${block.id}`);
                    }
                  });
                }
              });
            });
            console.log('[LessonEditor] 📦 Collapsed all script blocks by default and fixed overlaps');
            console.log('[LessonEditor] 📦 Collapsed blocks Set:', Array.from(this.collapsedScriptBlocks));
            
            // If overlaps were fixed, we'll save them when the user makes their next change
            // Don't auto-save here to avoid creating unnecessary drafts
            if (overlapsFixed) {
              console.log('[LessonEditor] ✅ Fixed script block overlaps. Changes will be saved when you make your next edit.');
              // Don't mark as changed - just fix in memory
              // The fixed times will be saved when the user makes their next change
            }
          } else {
            console.warn('[LessonEditor] ⚠️ No stages found in lesson data');
            this.stages = [];
          }
          
          // Load learning objectives from various possible locations
          this.learningObjectives = 
            lesson.objectives?.learningObjectives ||
            lesson.data?.objectives?.learningObjectives ||
            lesson.data?.structure?.learningObjectives ||
            lesson.data?.aiContext?.contextData?.lessonObjectives ||
            [];
          
          // Load lesson outcomes
          this.lessonOutcomes = 
            lesson.objectives?.lessonOutcomes ||
            lesson.data?.objectives?.lessonOutcomes ||
            [];
          
          // Ensure we have at least empty arrays if nothing was found
          if (!this.learningObjectives || this.learningObjectives.length === 0) {
            this.learningObjectives = [];
          }
          if (!this.lessonOutcomes || this.lessonOutcomes.length === 0) {
            this.lessonOutcomes = [];
          }
          
          console.log('[LessonEditor] 📚 Loaded learning objectives:', this.learningObjectives);
          console.log('[LessonEditor] 🎯 Loaded lesson outcomes:', this.lessonOutcomes);
          
          // Restore selection from localStorage (after stages are loaded)
          // If no valid selection is found, default to lesson
          this.restoreSelectionFromStorage();
          if (!this.selectedItem || (this.selectedItem.type === 'lesson' && !this.selectedItem.id)) {
            this.selectedItem = { type: 'lesson', id: lesson.id };
          }
        },
        error: (error: any) => {
          console.error('[LessonEditor] ❌ Failed to load lesson:', error);
          alert('Failed to load lesson. Please try again.');
          this.router.navigate(['/lesson-builder']);
        }
      });
  }

  loadProcessedContent() {
    const lessonId = this.route.snapshot.paramMap.get('id');
    console.log('[LessonEditor] 🔍 Loading processed content for lesson:', lessonId);
    if (lessonId && lessonId !== 'new') {
      // Load from backend API instead of localStorage
      this.http.get<any[]>(`${environment.apiUrl}/lesson-editor/lessons/${lessonId}/processed-outputs`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (items) => {
            console.log('[LessonEditor] 🔍 Processed content items loaded from backend:', items);
            this.processedContentItems = items;
          },
          error: (error) => {
            console.error('[LessonEditor] ❌ Failed to load processed content:', error);
            this.processedContentItems = [];
          }
        });
    } else {
      console.log('[LessonEditor] ⚠️ No lesson ID or new lesson, skipping processed content load');
    }
  }

  /**
   * Load content sources directly linked to this lesson
   * This includes iframe guide URLs and documents that have been linked but may not have processed content yet
   */
  loadLinkedContentSources() {
    const lessonId = this.route.snapshot.paramMap.get('id');
    console.log('[LessonEditor] 🔍 Loading linked content sources for lesson:', lessonId);
    if (lessonId && lessonId !== 'new') {
      this.contentSourceService.getLinkedContent(lessonId)
        .then((sources) => {
          console.log('[LessonEditor] 🔍 Linked content sources loaded:', sources);
          this.sourceContentItems = sources || [];
        })
        .catch((error) => {
          console.error('[LessonEditor] ❌ Failed to load linked content sources:', error);
          this.sourceContentItems = [];
        });
    } else {
      console.log('[LessonEditor] ⚠️ No lesson ID or new lesson, skipping linked content sources load');
      this.sourceContentItems = [];
    }
  }

  /**
   * Load processed content items that are linked to interactions in this lesson
   */
  loadProcessedContentFromInteractions() {
    if (!this.stages || this.stages.length === 0) {
      console.log('[LessonEditor] No stages, skipping interaction content load');
      return;
    }

    const contentOutputIds: string[] = [];
    
    // Collect all contentOutputIds from interactions
    this.stages.forEach(stage => {
      stage.subStages.forEach(substage => {
        if (substage.contentOutputId) {
          contentOutputIds.push(substage.contentOutputId);
        }
        if (substage.interaction?.contentOutputId) {
          contentOutputIds.push(substage.interaction.contentOutputId);
        }
      });
    });

    if (contentOutputIds.length === 0) {
      console.log('[LessonEditor] No contentOutputIds found in interactions');
      return;
    }

    console.log('[LessonEditor] Loading processed content from interactions:', contentOutputIds);

    // Load each processed output
    const loadPromises = contentOutputIds.map(id => 
      this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${id}`)
        .pipe(
          catchError(error => {
            console.warn(`[LessonEditor] Failed to load processed output ${id}:`, error);
            return of(null);
          })
        )
        .toPromise()
    );

    Promise.all(loadPromises).then(results => {
      const newItems = results
        .filter(item => item !== null)
        .map(item => item as ProcessedContentItem)
        .filter(item => {
          // Only add if not already in processedContentItems
          return !this.processedContentItems.find(existing => existing.id === item.id);
        });

      if (newItems.length > 0) {
        console.log('[LessonEditor] Adding processed content from interactions:', newItems.length);
        this.processedContentItems.push(...newItems);
      }
    });
  }

  viewProcessedContent(content: ProcessedContentItem) {
    console.log('[LessonEditor] View processed content:', content);
    // Fetch the full processed output data from API
    this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${content.id}`)
      .subscribe({
        next: (fullData: any) => {
          console.log('[LessonEditor] Full processed data:', fullData);
          this.selectedProcessedJson = {
            ...fullData,
            outputDataJson: JSON.stringify(fullData.outputData || {}, null, 2)
          };
          this.showProcessedContentJsonModal = true;
          // Hide header
          document.body.style.overflow = 'hidden';
          const header = document.querySelector('app-header');
          if (header) (header as HTMLElement).style.display = 'none';
        },
        error: (err) => {
          console.error('[LessonEditor] Failed to load processed content:', err);
          this.showSnackbar('Failed to load content details', 'error');
        }
      });
  }

  closeProcessedContentViewer() {
    this.showProcessedContentJsonModal = false;
    this.selectedProcessedJson = null;
    // Show header
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
  }

  saveProcessedContentJson() {
    if (!this.selectedProcessedJson) return;
    
    try {
      // Parse the JSON to validate it
      const parsedData = JSON.parse(this.selectedProcessedJson.outputDataJson);
      
      // Update via API
      this.http.patch(`${environment.apiUrl}/lesson-editor/processed-outputs/${this.selectedProcessedJson.id}`, {
        outputData: parsedData,
        outputName: this.selectedProcessedJson.outputName
      }).subscribe({
        next: () => {
          this.showSnackbar('Processed content updated', 'success');
          this.markAsChanged(); // Mark lesson as changed
          this.closeProcessedContentViewer();
          this.loadProcessedContent(); // Reload
        },
        error: (err) => {
          console.error('[LessonEditor] Failed to update processed content:', err);
          this.showSnackbar('Failed to update content', 'error');
        }
      });
    } catch (err) {
      this.showSnackbar('Invalid JSON format', 'error');
    }
  }

  deleteProcessedContent(content: any) {
    const contentTitle = content.title || content.outputName || 'this item';
    const confirmed = confirm(`Are you sure you want to delete "${contentTitle}"?`);
    if (!confirmed) {
      return;
    }

    console.log('[LessonEditor] 🗑️ Deleting processed content:', content.id);
    
    this.http.delete(`${environment.apiUrl}/lesson-editor/processed-outputs/${content.id}`)
      .subscribe({
        next: () => {
          console.log('[LessonEditor] ✅ Deleted successfully');
          // Reload the list
          this.loadProcessedContent();
        },
        error: (error) => {
          console.error('[LessonEditor] ❌ Failed to delete:', error);
          alert('Failed to delete processed content');
        }
      });
  }

  ngOnDestroy() {
    // Remove browser-level unsaved changes warning
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    // Always reset body overflow and header when leaving page
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) {
      (header as HTMLElement).style.display = '';
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Browser-level unsaved changes warning
   */
  handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    }
    return undefined;
  }

  // Navigation
  goBack() {
    if (this.hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    this.router.navigate(['/lesson-builder']);
  }

  // Draft Management  
  async saveDraft() {
    console.log('[LessonEditor] 🔥🔥🔥 VERSION 0.0.5 - saveDraft() called 🔥🔥🔥');
    
    // If there are no unsaved changes, don't save and show a message
    if (!this.hasUnsavedChanges && this.lastSaved) {
      this.showSnackbar('No changes to save', 'info');
      // Don't reset hasUnsavedChanges here - it's already false
      return;
    }
    console.log('[LessonEditor] Lesson ID:', this.lesson?.id, 'Type:', typeof this.lesson?.id);
    
    if (!this.lesson) {
      this.showSnackbar('No lesson to save', 'error');
      return;
    }

    if (!this.lesson?.id || this.lesson?.id === '' || this.lesson?.id === 'new') {
      this.showSnackbar('Cannot save draft for a new lesson. Please create the lesson first.', 'error');
      console.error('[LessonEditor] ❌ Cannot save draft - invalid lesson ID:', this.lesson?.id);
      return;
    }

    // Check for pending changes
    if (await this.refreshPendingDraftStatus()) {
      this.pendingWarningAction = 'save';
      this.showPendingChangesWarning = true;
      return;
    }

    this.executeSaveDraft();
  }

  executeSaveDraft() {
    if (!this.lesson?.id) {
      this.showSnackbar('No lesson to save', 'error');
      return;
    }
    console.log('[LessonEditor] 💾 Saving draft for lesson:', this.lesson?.id);
    this.saving = true;

    // Build the draft data from current state
    const draftData = {
      title: this.lesson.title,
      description: this.lesson.description,
      category: this.lesson.category,
      difficulty: this.lesson.difficulty,
      durationMinutes: this.calculateTotalDuration(),
      thumbnailUrl: this.lesson.thumbnailUrl,
      tags: this.lesson.tags,
      objectives: {
        learningObjectives: this.learningObjectives.filter(obj => obj && obj.trim() !== ''),
        lessonOutcomes: this.lessonOutcomes.filter(outcome => outcome.title && outcome.title.trim() !== '')
      },
      structure: {
        stages: this.stages.map(stage => ({
          id: stage.id,
          title: stage.title,
          type: stage.type,
          subStages: stage.subStages.map(substage => {
            const interactionData = substage.interaction
              ? {
                  id: substage.interaction.id,
                  type: substage.interaction.type,
                  name: substage.interaction.name,
                  category: substage.interaction.category,
                  contentOutputId: substage.interaction.contentOutputId || substage.contentOutputId || null,
                  config: substage.interaction.config
                    ? JSON.parse(JSON.stringify(substage.interaction.config))
                    : {}
                }
              : substage.interactionType
                ? {
                    type: substage.interactionType,
                    contentOutputId: substage.contentOutputId || null,
                    config: {}
                  }
                : null;

            // Convert scriptBlocks from editor format to DB format
            // Save ALL blocks (teacher_talk, load_interaction, pause) with their times
            const allScriptBlocks = (substage.scriptBlocks || []).map(block => {
              if (block.type === 'teacher_talk') {
                return {
                  id: block.id,
                  type: 'teacher_talk',
                  text: block.content || '',
                  idealTimestamp: block.startTime || 0,
                  estimatedDuration: (block.endTime || block.startTime || 0) - (block.startTime || 0) || 10,
                  startTime: block.startTime || 0,
                  endTime: block.endTime || block.startTime || 0,
                  playbackRules: block.metadata || {},
                  // Include display configuration
                  showInSnack: block.showInSnack || false,
                  snackDuration: block.snackDuration || undefined,
                  openChatUI: block.openChatUI || false,
                  minimizeChatUI: block.minimizeChatUI || false,
                  activateFullscreen: block.activateFullscreen || false,
                  autoProgressAtEnd: block.autoProgressAtEnd !== undefined ? block.autoProgressAtEnd : true
                };
              } else if (block.type === 'load_interaction') {
                return {
                  id: block.id,
                  type: 'load_interaction',
                  startTime: block.startTime || 0,
                  endTime: block.endTime || block.startTime || 0,
                  estimatedDuration: (block.endTime || block.startTime || 0) - (block.startTime || 0) || 10,
                  autoProgressAtEnd: block.autoProgressAtEnd !== undefined ? block.autoProgressAtEnd : true,
                  // Include chat UI and fullscreen config for load_interaction blocks
                  openChatUI: block.openChatUI || false,
                  minimizeChatUI: block.minimizeChatUI || false,
                  activateFullscreen: block.activateFullscreen || false
                };
              } else if (block.type === 'pause') {
                return {
                  id: block.id,
                  type: 'pause',
                  startTime: block.startTime || 0,
                  endTime: block.endTime || block.startTime || 0,
                  estimatedDuration: (block.endTime || block.startTime || 0) - (block.startTime || 0) || 10
                };
              }
              return null;
            }).filter(block => block !== null);
            
            // Separate scriptBlocks and scriptBlocksAfterInteraction based on interaction position
            const interactionIndex = (substage.scriptBlocks || []).findIndex(b => b.type === 'load_interaction');
            const teacherTalkBlocks = allScriptBlocks.filter(b => b.type === 'teacher_talk');
            const preInteractionScripts = teacherTalkBlocks.filter((block, idx) => {
              const originalIndex = (substage.scriptBlocks || []).findIndex(b => b.id === block.id);
              return interactionIndex < 0 || originalIndex < interactionIndex;
            });
            const postInteractionScripts = teacherTalkBlocks.filter((block, idx) => {
              const originalIndex = (substage.scriptBlocks || []).findIndex(b => b.id === block.id);
              return interactionIndex >= 0 && originalIndex > interactionIndex;
            });
            
            // Include load_interaction block in the interaction data if it exists
            const loadInteractionBlock = allScriptBlocks.find(b => b.type === 'load_interaction');
            
            // Include load_interaction block timing and config in interaction config if it exists
            if (loadInteractionBlock && interactionData) {
              if (!interactionData.config) {
                interactionData.config = {};
              }
              interactionData.config.startTime = loadInteractionBlock.startTime;
              interactionData.config.endTime = loadInteractionBlock.endTime;
              interactionData.config.estimatedDuration = loadInteractionBlock.estimatedDuration;
              interactionData.config.autoProgressAtEnd = loadInteractionBlock.autoProgressAtEnd;
              // Include chat UI and fullscreen config for load_interaction blocks
              if (loadInteractionBlock.openChatUI !== undefined) {
                interactionData.config.openChatUI = loadInteractionBlock.openChatUI;
              }
              if (loadInteractionBlock.minimizeChatUI !== undefined) {
                interactionData.config.minimizeChatUI = loadInteractionBlock.minimizeChatUI;
              }
              if (loadInteractionBlock.activateFullscreen !== undefined) {
                interactionData.config.activateFullscreen = loadInteractionBlock.activateFullscreen;
              }
            }

            return {
              id: substage.id,
              title: substage.title,
              type: substage.type,
              duration: substage.duration,
              scriptBlocks: preInteractionScripts,
              scriptBlocksAfterInteraction: postInteractionScripts,
              contentOutputId: substage.contentOutputId || interactionData?.contentOutputId || null,
              interactionType: substage.interactionType || interactionData?.type || null,
              interaction: interactionData,
              // Store load_interaction block timing separately for easy access
              loadInteractionTiming: loadInteractionBlock ? {
                startTime: loadInteractionBlock.startTime,
                endTime: loadInteractionBlock.endTime,
                estimatedDuration: loadInteractionBlock.estimatedDuration,
                autoProgressAtEnd: loadInteractionBlock.autoProgressAtEnd
              } : null
            };
          })
        }))
      },
      // Include content sources in draft data for proper diff comparison
      contentReferences: {
        contentSources: this.getSourceContentForLesson().map(source => ({
          id: source.id,
          title: source.title,
          type: source.type,
          sourceUrl: (source as any).sourceUrl || (source as any).url || null,
          filePath: (source as any).filePath || null,
          metadata: (source as any).metadata || {}
        }))
      }
    };

    const payload = {
      lessonId: String(this.lesson?.id || ''), // Ensure it's a string
      draftData: draftData,
      changeSummary: this.generateChangeSummary(),
      changesCount: this.countChanges()
    };

    console.log('[LessonEditor] 📤 Draft payload:', JSON.stringify(payload, null, 2));
    console.log('[LessonEditor] 📤 Lesson ID:', this.lesson?.id, 'Type:', typeof this.lesson?.id);
    console.log('[LessonEditor] 📤 API URL:', `${environment.apiUrl}/lesson-drafts`);
    console.log('[LessonEditor] 📤 Headers:', { 'x-tenant-id': environment.tenantId, 'x-user-id': environment.defaultUserId });

    this.http.post(`${environment.apiUrl}/lesson-drafts`, payload, {
      headers: {
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId
      }
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (response: any) => {
          this.saving = false;
          this.hasUnsavedChanges = false;
          this.hasDraft = true;
          this.hasPendingDraft = true; // After saving, there's now a pending draft
          this.lastSaved = new Date();
          // Store the draft ID so we can compare it later
          this.currentDraftId = response?.id || response?.draftId || null;
          // Update pending draft data to current state (include the draft ID for comparison)
          this.pendingDraftData = {
            ...draftData,
            id: this.currentDraftId
          };
          console.log('[LessonEditor] ✅ Draft saved:', response, 'Draft ID:', this.currentDraftId);
          
          // Check if draft has content changes by getting the diff
          if (this.currentDraftId) {
            try {
              const diff = await firstValueFrom(
                this.http.get<any>(`${environment.apiUrl}/lesson-drafts/${this.currentDraftId}/diff`, {
                  headers: {
                    'x-tenant-id': environment.tenantId,
                    'x-user-id': environment.defaultUserId
                  }
                }).pipe(
                  catchError(() => of({ hasContentChanges: false }))
                )
              );
              this.hasContentChanges = diff.hasContentChanges || false;
              console.log('[LessonEditor] Draft has content changes:', this.hasContentChanges);
            } catch (error) {
              console.error('[LessonEditor] Failed to check content changes:', error);
              this.hasContentChanges = false; // Default to false if we can't check
            }
          }
          
          // CRITICAL: Ensure liveLessonData is set if it's not already set
          // This allows "Show Current State" to work after saving
          if (!this.liveLessonData && this.lesson?.id) {
            // Reload the live lesson to get the current approved state
            this.http.get<any>(`${environment.apiUrl}/lessons/${this.lesson.id}`, {
              headers: { 'x-tenant-id': environment.tenantId }
            }).subscribe({
              next: (lesson) => {
                this.liveLessonData = JSON.parse(JSON.stringify(lesson));
                // Ensure objectives are included
                if (!this.liveLessonData.objectives && (lesson.objectives || lesson.data?.objectives)) {
                  this.liveLessonData.objectives = lesson.objectives || lesson.data?.objectives || {};
                }
                console.log('[LessonEditor] ✅ Live lesson data loaded after save');
              },
              error: (err) => {
                console.error('[LessonEditor] Failed to load live lesson data after save:', err);
              }
            });
          }
          
          // Automatically switch to showing pending changes view after saving
          if (!this.showingPendingChanges && this.liveLessonData) {
            // Set flag first, then apply pending changes
            this.showingPendingChanges = true;
            // Manually apply pending changes (same logic as togglePendingChanges but without toggling)
            const liveClone = JSON.parse(JSON.stringify(this.liveLessonData));
            const draftClone = JSON.parse(JSON.stringify(this.pendingDraftData));
            
            const merged: any = {
              ...liveClone,
              ...draftClone,
              id: this.lesson?.id || liveClone?.id || ''
            };
            
            if (draftClone?.objectives) {
              merged.objectives = JSON.parse(JSON.stringify(draftClone.objectives));
            } else if (liveClone?.objectives) {
              merged.objectives = JSON.parse(JSON.stringify(liveClone.objectives));
            }
            
            const mergedData = {
              ...(liveClone?.data || {}),
              ...(draftClone?.data || {})
            };
            
            if (draftClone?.data?.objectives) {
              mergedData.objectives = JSON.parse(JSON.stringify(draftClone.data.objectives));
            } else if (liveClone?.data?.objectives && !mergedData.objectives) {
              mergedData.objectives = JSON.parse(JSON.stringify(liveClone.data.objectives));
            }
            
            if (draftClone?.structure) {
              mergedData.structure = draftClone.structure;
            } else if (draftClone?.data?.structure) {
              mergedData.structure = draftClone.data.structure;
            } else if (draftClone?.data?.stages) {
              mergedData.structure = { stages: draftClone.data.stages };
            } else if ((draftClone as any)?.stages) {
              mergedData.structure = { stages: (draftClone as any).stages };
            } else if (!mergedData.structure && liveClone?.data?.structure) {
              mergedData.structure = JSON.parse(JSON.stringify(liveClone.data.structure));
            }
            
            merged.data = mergedData;
            this.loadLessonDataIntoEditor(merged);
          }
          
          this.showSnackbar('Draft saved successfully', 'success');
        },
        error: (error: any) => {
          this.saving = false;
          console.error('[LessonEditor] ❌ v3.9.0 - Failed to save draft:', error);
          console.error('[LessonEditor] ❌ v3.9.0 - Error status:', error.status);
          console.error('[LessonEditor] ❌ v3.9.0 - Error message:', error.error?.message || error.message);
          console.error('[LessonEditor] ❌ v3.9.0 - Full error object:', JSON.stringify(error.error, null, 2));
          console.error('[LessonEditor] ❌ v3.9.0 - Lesson ID that was sent:', this.lesson?.id, 'Type:', typeof this.lesson?.id);
          console.error('[LessonEditor] ❌ v3.9.0 - Request payload that was sent:', payload);
          this.showSnackbar(`Failed to save draft: ${error.error?.message || error.message}`, 'error');
        }
      });
  }

  async submitForApproval() {
    console.log('[LessonEditor] 📤 submitForApproval called');
    console.log('[LessonEditor] 📤 hasContentChanges:', this.hasContentChanges);
    console.log('[LessonEditor] 📤 hasUnsavedChanges:', this.hasUnsavedChanges);
    console.log('[LessonEditor] 📤 hasDraft:', this.hasDraft);
    console.log('[LessonEditor] 📤 currentDraftId:', this.currentDraftId);
    console.log('[LessonEditor] 📤 lesson.id:', this.lesson?.id);
    
    if (!this.lesson) {
      this.showSnackbar('No lesson to submit', 'error');
      return;
    }

    // First, refresh draft status to check for existing drafts on the server
    console.log('[LessonEditor] 🔍 Refreshing draft status...');
    const hasPendingDraft = await this.refreshPendingDraftStatus();
    console.log('[LessonEditor] 🔍 After refresh - hasPendingDraft:', hasPendingDraft);
    console.log('[LessonEditor] 🔍 After refresh - currentDraftId:', this.currentDraftId);
    console.log('[LessonEditor] 🔍 After refresh - hasDraft:', this.hasDraft);
    console.log('[LessonEditor] 🔍 After refresh - hasContentChanges:', this.hasContentChanges);

    // If we found a pending draft, check if we should show warning
    if (hasPendingDraft && this.showPendingChangesWarning === false) {
      // Only show warning if there are actual changes to review
      if (this.pendingDraftData) {
        this.pendingWarningAction = 'submit';
        this.showPendingChangesWarning = true;
        return;
      }
    }

    // Save draft if there are unsaved changes
    if (this.hasUnsavedChanges) {
      console.log('[LessonEditor] 💾 Saving draft before submission (has unsaved changes)...');
      const hadUnsavedChangesBeforeSave = this.hasUnsavedChanges;
      const hadDraftBeforeSave = this.hasDraft;
      const hadCurrentDraftIdBeforeSave = !!this.currentDraftId;
      
      // Call executeSaveDraft directly to ensure it actually saves
      await this.executeSaveDraft();
      
      // Wait for save to complete
      let waitCount = 0;
      while (this.saving && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      
      // If save didn't actually complete (no draft ID and still has unsaved changes was false), restore state
      if (hadUnsavedChangesBeforeSave && !this.currentDraftId && !this.hasDraft) {
        console.log('[LessonEditor] ⚠️ Save did not complete, restoring hasUnsavedChanges');
        this.hasUnsavedChanges = true;
      }
      
      // Wait a moment for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh draft status again after save
      await this.refreshPendingDraftStatus();
    }

    // Check if we have a draft ID now (either from save or from refresh)
    // Also check if refreshPendingDraftStatus found a draft but didn't set currentDraftId
    if (!this.currentDraftId && this.hasDraft) {
      console.log('[LessonEditor] ⚠️ Has draft but no currentDraftId - refreshing again...');
      await this.refreshPendingDraftStatus();
    }
    
    if (!this.currentDraftId) {
      console.log('[LessonEditor] ❌ Cannot submit - no draft available');
      console.log('[LessonEditor] ❌ hasDraft:', this.hasDraft);
      console.log('[LessonEditor] ❌ hasUnsavedChanges:', this.hasUnsavedChanges);
      console.log('[LessonEditor] ❌ currentDraftId:', this.currentDraftId);
      this.showSnackbar('No draft to publish. Please save your changes first.', 'error');
      // Don't reset hasUnsavedChanges here - let the user save manually
      return;
    }

    // Check if draft has content changes - if not, publish directly
    if (!this.hasContentChanges) {
      console.log('[LessonEditor] 📤 Publishing draft directly (no content changes)...');
      await this.publishDraft();
      return;
    }
    
    console.log('[LessonEditor] 📤 Submitting draft for approval (has content changes)...');
    
    // In the approval workflow, submitting means the draft is already created
    // and set to 'pending' status. We just need to mark it locally as submitted.
    this.hasBeenSubmitted = true;
    this.showSnackbar('Draft submitted for approval! Check the Approval Queue.', 'success');
  }

  async publishDraft() {
    if (!this.lesson?.id || !this.currentDraftId) {
      console.warn('[LessonEditor] ⚠️ Cannot publish: lesson.id=', this.lesson?.id, 'currentDraftId=', this.currentDraftId);
      this.showSnackbar('No draft to publish', 'error');
      return;
    }

    try {
      console.log('[LessonEditor] 🚀 Publishing draft:', this.currentDraftId, 'for lesson:', this.lesson.id);
      
      const response = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/lesson-drafts/${this.currentDraftId}/publish`, {}, {
          headers: {
            'x-tenant-id': environment.tenantId,
            'x-user-id': environment.defaultUserId
          }
        })
      );

      console.log('[LessonEditor] ✅ Draft published successfully:', response);
      
      // Reload the lesson to get the updated state
      await this.loadLesson(this.lesson.id);
      
      // Reset draft state
      this.hasDraft = false;
      this.hasPendingDraft = false;
      this.hasContentChanges = false;
      this.hasBeenSubmitted = false;
      this.currentDraftId = null;
      this.pendingDraftData = null;
      this.liveLessonData = null;
      this.showingPendingChanges = false;
      
      this.showSnackbar('Changes published successfully!', 'success');
    } catch (error: any) {
      console.error('[LessonEditor] ❌ Failed to publish draft:', error);
      const errorMessage = error.error?.message || error.message || 'Failed to publish draft';
      
      // If publish fails because draft has content changes, fall back to approval
      if (error.status === 409 && errorMessage.includes('content changes')) {
        console.log('[LessonEditor] ⚠️ Draft has content changes, submitting for approval instead...');
        this.hasBeenSubmitted = true;
        this.showSnackbar('Draft submitted for approval (contains content changes)', 'info');
      } else {
        this.showSnackbar(`Failed to publish: ${errorMessage}`, 'error');
      }
    }
  }

  togglePendingChanges() {
    // If we're currently showing pending changes and want to show current state,
    // we can do that without needing to refresh (we already have liveLessonData)
    if (this.showingPendingChanges) {
      // Toggling from pending to current state - we have liveLessonData, so proceed
      if (!this.liveLessonData) {
        console.log('[LessonEditor] Cannot toggle - no live lesson data available');
        this.showSnackbar('No live lesson data available', 'error');
        return;
      }
      this.doTogglePendingChanges();
      return;
    }

    // If we're showing current state and want to show pending changes,
    // refresh status first to ensure we have latest data
    this.refreshPendingDraftStatus().then(() => {
      if (!this.hasPendingDraft || !this.pendingDraftData || !this.liveLessonData) {
        console.log('[LessonEditor] Cannot toggle - no pending draft data available');
        this.hasPendingDraft = false;
        this.pendingDraftData = null;
        this.showSnackbar('No pending changes to show', 'info');
        return;
      }
      this.doTogglePendingChanges();
    });
  }

  private doTogglePendingChanges() {
    // When showing current state, we only need liveLessonData
    if (this.showingPendingChanges && !this.liveLessonData) {
      console.log('[LessonEditor] Cannot toggle to current state - no live lesson data');
      return;
    }

    // When showing pending changes, we need both pendingDraftData and liveLessonData
    if (!this.showingPendingChanges && (!this.hasPendingDraft || !this.pendingDraftData || !this.liveLessonData)) {
      console.log('[LessonEditor] Cannot toggle to pending changes - missing data');
      return;
    }

    this.showingPendingChanges = !this.showingPendingChanges;

    if (this.showingPendingChanges) {
      // Apply pending changes
      console.log('[LessonEditor] 📝 Applying pending changes');
      console.log('[LessonEditor] 📝 Live lesson data (immutable copy preserved):', this.liveLessonData);
      console.log('[LessonEditor] 📝 Pending draft data:', this.pendingDraftData);
      
      // Always work from deep clones so the stored live lesson never mutates
      const liveClone = JSON.parse(JSON.stringify(this.liveLessonData));
      const draftClone = JSON.parse(JSON.stringify(this.pendingDraftData));
      
      // Build merged object without sharing references with live data
      const merged: any = {
        ...liveClone,
        ...draftClone,
        id: this.lesson?.id || liveClone?.id || ''
      };
      
      // Merge objectives (draft takes precedence)
      if (draftClone?.objectives) {
        merged.objectives = JSON.parse(JSON.stringify(draftClone.objectives));
      } else if (liveClone?.objectives) {
        merged.objectives = JSON.parse(JSON.stringify(liveClone.objectives));
      }
      
      const mergedData = {
        ...(liveClone?.data || {}),
        ...(draftClone?.data || {})
      };
      
      // Merge objectives in data if present
      if (draftClone?.data?.objectives) {
        mergedData.objectives = JSON.parse(JSON.stringify(draftClone.data.objectives));
      } else if (liveClone?.data?.objectives && !mergedData.objectives) {
        mergedData.objectives = JSON.parse(JSON.stringify(liveClone.data.objectives));
      }
      
      if (draftClone?.structure) {
        mergedData.structure = draftClone.structure;
      } else if (draftClone?.data?.structure) {
        mergedData.structure = draftClone.data.structure;
      } else if (draftClone?.data?.stages) {
        mergedData.structure = { stages: draftClone.data.stages };
      } else if ((draftClone as any)?.stages) {
        mergedData.structure = { stages: (draftClone as any).stages };
      } else if (!mergedData.structure && liveClone?.data?.structure) {
        mergedData.structure = JSON.parse(JSON.stringify(liveClone.data.structure));
      }
      
      merged.data = mergedData;
      
      console.log('[LessonEditor] 📝 Merged data built from clones:', merged);
      // Preserve current selection before loading
      const preservedSelection = { ...this.selectedItem };
      this.loadLessonDataIntoEditor(merged);
      // Restore selection after loading
      this.restoreSelection(preservedSelection);
    } else {
      // Show current state (live lesson) - RELOAD from server to ensure we have the latest approved state
      console.log('[LessonEditor] 📋 Showing current state - RELOADING from server');
      
      if (!this.lesson?.id) {
        console.error('[LessonEditor] ❌ No lesson ID available');
        this.showSnackbar('No lesson loaded', 'error');
        return;
      }
      
      // Reload the lesson from server to get the latest approved state
      this.http.get<any>(`${environment.apiUrl}/lessons/${this.lesson.id}`, {
        headers: { 'x-tenant-id': environment.tenantId }
      }).subscribe({
        next: (lesson) => {
          // Update liveLessonData with the fresh data from server
          this.liveLessonData = JSON.parse(JSON.stringify(lesson));
          // Ensure objectives are included
          if (!this.liveLessonData.objectives && (lesson.objectives || lesson.data?.objectives)) {
            this.liveLessonData.objectives = lesson.objectives || lesson.data?.objectives || {};
          }
          
          // Deep clone to avoid reference issues - CRITICAL!
          const liveData = JSON.parse(JSON.stringify(this.liveLessonData));
      
      console.log('[LessonEditor] 📋 Deep cloned live data');
      console.log('[LessonEditor] 📋 Original liveLessonData stages:', {
        'data.structure.stages': this.liveLessonData.data?.structure?.stages?.length || 0,
        'data.stages': this.liveLessonData.data?.stages?.length || 0,
        'structure.stages': this.liveLessonData.structure?.stages?.length || 0
      });
      
      // Ensure live lesson data is properly structured
      // Live lesson should have data.structure.stages format
      if (!liveData.data && liveData.structure) {
        // If structure is at root, move it to data.structure
        liveData.data = { structure: liveData.structure };
        console.log('[LessonEditor] 📋 Moved structure to data.structure');
      }
      
      // Also ensure data.structure exists if we have stages
      if (!liveData.data) {
        liveData.data = {};
      }
      if (!liveData.data.structure && (liveData.data.stages || liveData.structure?.stages)) {
        liveData.data.structure = { stages: liveData.data.stages || liveData.structure?.stages || [] };
        console.log('[LessonEditor] 📋 Created data.structure from stages');
      }
      
      console.log('[LessonEditor] 📋 Processed live data structure:', {
        hasData: !!liveData.data,
        hasStructure: !!liveData.structure,
        hasDataStructure: !!liveData.data?.structure,
        stagesPath: liveData.data?.structure?.stages ? 'data.structure.stages' : 
                    liveData.data?.stages ? 'data.stages' : 
                    liveData.structure?.stages ? 'structure.stages' : 'none',
        stagesCount: liveData.data?.structure?.stages?.length || 
                     liveData.data?.stages?.length || 
                     liveData.structure?.stages?.length || 0,
        firstStageTitle: liveData.data?.structure?.stages?.[0]?.title || 
                         liveData.data?.stages?.[0]?.title || 
                         liveData.structure?.stages?.[0]?.title || 'none'
      });
      
          console.log('[LessonEditor] 📋 About to load live data into editor');
          // Preserve current selection before loading
          const preservedSelection = { ...this.selectedItem };
          this.loadLessonDataIntoEditor(liveData);
          // Restore selection after loading
          this.restoreSelection(preservedSelection);
          
          // If interaction config modal is open, reload the config from the live data
          if (this.showInteractionConfigModal) {
            const substage = this.getSelectedSubStage();
            if (substage?.interaction?.config) {
              this.interactionConfig = JSON.parse(JSON.stringify(substage.interaction.config));
              console.log('[LessonEditor] 📋 Reloaded interaction config from live data');
            }
          }
          
          console.log('[LessonEditor] 📋 Live data loaded into editor');
        },
        error: (err) => {
          console.error('[LessonEditor] ❌ Failed to reload live lesson:', err);
          this.showSnackbar('Failed to reload current state', 'error');
        }
      });
    }
  }

  loadLessonDataIntoEditor(lessonData: any) {
    if (!lessonData) {
      console.warn('[LessonEditor] ⚠️ loadLessonDataIntoEditor called with null/undefined data');
      return;
    }
    
    console.log('[LessonEditor] 🔄 Loading lesson data into editor');
    console.log('[LessonEditor] 🔄 Full lessonData:', JSON.stringify(lessonData, null, 2).substring(0, 500));
    
    // Completely replace lesson metadata (don't merge)
    this.lesson = {
      ...lessonData,
      id: lessonData.id || this.lesson?.id
    };
    
    // Try multiple paths for stages data - draft data has structure.stages, live has data.structure.stages
    const stagesData = lessonData.data?.structure?.stages 
      || lessonData.data?.stages 
      || lessonData.structure?.stages
      || (lessonData.data && lessonData.data.stages);
    
    console.log('[LessonEditor] 🔄 Stages data found:', stagesData);
    console.log('[LessonEditor] 🔄 Stages data path check:', {
      'data.structure.stages': lessonData.data?.structure?.stages,
      'data.stages': lessonData.data?.stages,
      'structure.stages': lessonData.structure?.stages,
      'hasData': !!lessonData.data,
      'hasStructure': !!lessonData.structure
    });
    
    if (stagesData && Array.isArray(stagesData)) {
      console.log('[LessonEditor] 🔄 Parsing stages, count:', stagesData.length);
      console.log('[LessonEditor] 🔄 Raw stages data preview:', JSON.stringify(stagesData, null, 2).substring(0, 500));
      
      // Clear existing stages first - create new empty array reference
      this.stages.length = 0;
      
      // Parse and assign new stages (create completely new array reference)
      const parsedStages = this.parseStagesFromJSON(stagesData);
      
      // Completely replace the array
      this.stages.splice(0, this.stages.length, ...parsedStages);
      
      // Collapse all script blocks by default and fix any overlapping times
      this.collapsedScriptBlocks.clear();
      let overlapsFixed = false;
      this.stages.forEach((stage, stageIdx) => {
        stage.subStages.forEach((substage, substageIdx) => {
          if (substage.scriptBlocks && substage.scriptBlocks.length > 0) {
            console.log(`[LessonEditor] 🔍 Checking substage "${substage.title}" (${substage.scriptBlocks.length} blocks)`);
            // Log blocks before fix
            substage.scriptBlocks.forEach((block, blockIdx) => {
              console.log(`[LessonEditor]   Block ${blockIdx}: type=${block.type}, startTime=${block.startTime}, endTime=${block.endTime}, id=${block.id}`);
            });
            
            // Fix any overlapping times for blocks of the same type
            const hadOverlaps = this.fixScriptBlockOverlaps(substage.scriptBlocks);
            if (hadOverlaps) {
              overlapsFixed = true;
              console.log(`[LessonEditor] ✅ Fixed overlaps in substage "${substage.title}"`);
              // Log blocks after fix
              substage.scriptBlocks.forEach((block, blockIdx) => {
                console.log(`[LessonEditor]   Block ${blockIdx} (after fix): type=${block.type}, startTime=${block.startTime}, endTime=${block.endTime}, id=${block.id}`);
              });
            }
            
            substage.scriptBlocks.forEach((block) => {
              this.collapsedScriptBlocks.add(block.id);
            });
          }
        });
      });
      console.log('[LessonEditor] 📦 Collapsed all script blocks by default and fixed overlaps');
      
      // If overlaps were fixed, we'll save them when the user makes their next change
      // Don't auto-save here to avoid creating unnecessary drafts
      if (overlapsFixed) {
        console.log('[LessonEditor] ✅ Fixed script block overlaps. Changes will be saved when you make your next edit.');
        // Don't mark as changed - just fix in memory
        // The fixed times will be saved when the user makes their next change
      }
      
      console.log('[LessonEditor] 🔄 Parsed stages count:', this.stages.length);
      console.log('[LessonEditor] 🔄 Stages array reference changed:', this.stages);
      
      // Restore selection from localStorage after stages are loaded
      this.restoreSelectionFromStorage();
      
      if (this.stages.length > 0) {
        console.log('[LessonEditor] 🔄 First stage:', this.stages[0]);
        console.log('[LessonEditor] 🔄 First stage subStages count:', this.stages[0]?.subStages?.length || 0);
      }
    } else {
      console.warn('[LessonEditor] ⚠️ No stages data found, clearing stages');
      // Create new empty array reference
      this.stages = [];
    }
    
    // Load learning objectives from various possible locations
    this.learningObjectives = 
      lessonData.objectives?.learningObjectives ||
      lessonData.data?.objectives?.learningObjectives ||
      lessonData.data?.structure?.learningObjectives ||
      lessonData.data?.aiContext?.contextData?.lessonObjectives ||
      [];
    
    // Load lesson outcomes
    this.lessonOutcomes = 
      lessonData.objectives?.lessonOutcomes ||
      lessonData.data?.objectives?.lessonOutcomes ||
      [];
    
    // Ensure we have at least empty arrays if nothing was found
    if (!this.learningObjectives || this.learningObjectives.length === 0) {
      this.learningObjectives = [];
    }
    if (!this.lessonOutcomes || this.lessonOutcomes.length === 0) {
      this.lessonOutcomes = [];
    }
    
    console.log('[LessonEditor] 🔄 Loaded learning objectives:', this.learningObjectives);
    console.log('[LessonEditor] 🔄 Loaded lesson outcomes:', this.lessonOutcomes);
    
    // Don't reset selection here - let restoreSelection handle it
    
    // Force change detection immediately
    this.cdr.detectChanges();
    
    // Also mark as changed to trigger UI update
    this.hasUnsavedChanges = true;
    
    // Use setTimeout to ensure Angular processes the changes
    setTimeout(() => {
      this.hasUnsavedChanges = false;
      this.cdr.detectChanges(); // Force change detection again
      console.log('[LessonEditor] 🔄 Change detection triggered');
    }, 50);
    
    // Also trigger after a longer delay to catch any async updates
    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('[LessonEditor] 🔄 Final check - stages count:', this.stages.length);
    }, 200);
    
    console.log('[LessonEditor] 🔄 Load complete - stages count:', this.stages.length);
  }

  closePendingWarning() {
    this.showPendingChangesWarning = false;
    this.pendingWarningAction = null;
  }

  async confirmPendingWarning() {
    this.showPendingChangesWarning = false;
    const action = this.pendingWarningAction;
    this.pendingWarningAction = null;

    // Delete older drafts first
    if (this.olderDraftIds.length > 0) {
      console.log('[LessonEditor] Deleting older drafts:', this.olderDraftIds);
      const deletePromises = this.olderDraftIds.map(draftId =>
        this.http.delete(`${environment.apiUrl}/lesson-drafts/${draftId}`, {
          headers: {
            'x-tenant-id': environment.tenantId,
            'x-user-id': environment.defaultUserId
          }
        }).pipe(
          catchError(error => {
            console.error(`[LessonEditor] Failed to delete draft ${draftId}:`, error);
            return of(null);
          })
        ).toPromise()
      );
      
      await Promise.all(deletePromises);
      console.log('[LessonEditor] Older drafts deleted');
      this.olderDraftIds = [];
    }

    if (action === 'save') {
      this.executeSaveDraft();
    } else if (action === 'submit') {
      // Save first, then submit
      this.executeSaveDraft();
      // After save completes, submit will be handled
      setTimeout(() => {
        this.hasBeenSubmitted = true;
        this.showSnackbar('Draft submitted for approval! Check the Approval Queue.', 'success');
      }, 500);
    }
  }

  // Helper methods for draft
  generateChangeSummary(): string {
    const changes: string[] = [];
    if (this.lesson?.title) changes.push('Updated lesson structure');
    if (this.stages.length > 0) changes.push(`${this.stages.length} stage(s)`);
    const totalSubStages = this.getTotalSubStages();
    if (totalSubStages > 0) changes.push(`${totalSubStages} substage(s)`);
    return changes.join(', ') || 'Minor changes';
  }

  countChanges(): number {
    let count = 0;
    for (const stage of this.stages) {
      count++; // Each stage counts
      count += stage.subStages.length; // Each substage counts
      for (const substage of stage.subStages) {
        count += (substage.scriptBlocks?.length || 0); // Each script block counts
      }
    }
    return count;
  }

  // Snackbar helper
  showSnackbar(message: string, type: 'success' | 'error' | 'info' = 'info') {
    console.log('[LessonEditor] 🍪 Showing snackbar:', message, type);
    
    // Clear any existing timeout
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
      this.snackbarTimeout = null;
    }
    
    this.snackbarMessage = message;
    this.snackbarType = type;
    this.snackbarVisible = true;
    
    console.log('[LessonEditor] 🍪 Snackbar state after:', {
      visible: this.snackbarVisible,
      message: this.snackbarMessage,
      type: this.snackbarType
    });
    
    // Force change detection using setTimeout to ensure it happens in next tick
    setTimeout(() => {
      this.cdr.detectChanges();
      console.log('[LessonEditor] 🍪 Change detection triggered for snackbar');
    }, 0);
    
    // Auto-hide after 5 seconds for success/info, 7 seconds for error
    const duration = type === 'error' ? 7000 : 5000;
    this.snackbarTimeout = setTimeout(() => {
      this.snackbarVisible = false;
      this.cdr.detectChanges();
      console.log('[LessonEditor] 🍪 Snackbar auto-hidden');
    }, duration);
  }

  canSubmit(): boolean {
    // Can't submit if there are no unsaved changes and no draft
    if (!this.hasUnsavedChanges && !this.hasDraft) {
      return false;
    }
    // Can submit if there are unsaved changes or if there's a draft that hasn't been submitted
    return this.hasUnsavedChanges || (this.hasDraft && !this.hasBeenSubmitted);
  }

  // Sidebar
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleMobileSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen = false;
  }

  // Selection
  selectItem(item: {type: 'lesson' | 'stage' | 'substage', id: string, stageId?: string}) {
    this.selectedItem = item;
    // Save to localStorage
    this.saveSelectionToStorage();
    // Load preview data if we're on preview tab and selected a substage
    if (this.activeTab === 'preview' && item.type === 'substage') {
      this.ensurePreviewDataLoaded();
    }
    console.log('[LessonEditor] 📍 Selected:', item);
    
    // Debug: Show the full substage data when selected
    if (item.type === 'substage') {
      const substage = this.getSelectedSubStage();
      console.log('[LessonEditor] 📍 Selected substage data:', substage);
      console.log('[LessonEditor] 📍 Substage has interaction?', !!substage?.interaction);
      console.log('[LessonEditor] 📍 Interaction details:', substage?.interaction);
    }
  }
  
  /**
   * Save current selection and active tab to localStorage
   */
  private saveSelectionToStorage() {
    if (!this.lesson?.id) return;
    
    const storageKey = `lesson-editor-selection-${this.lesson.id}`;
    const selection = {
      selectedItem: this.selectedItem,
      activeTab: this.activeTab
    };
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(selection));
      console.log('[LessonEditor] 💾 Saved selection to localStorage:', selection);
    } catch (error) {
      console.warn('[LessonEditor] ⚠️ Failed to save selection to localStorage:', error);
    }
  }
  
  /**
   * Restore selection and active tab from localStorage
   * Validates that the restored selection exists in the loaded lesson data
   */
  private restoreSelectionFromStorage() {
    if (!this.lesson?.id || !this.stages || this.stages.length === 0) return;
    
    const storageKey = `lesson-editor-selection-${this.lesson.id}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        console.log('[LessonEditor] 📦 No stored selection found');
        return;
      }
      
      const selection = JSON.parse(stored);
      console.log('[LessonEditor] 📦 Restoring selection from localStorage:', selection);
      
      // Validate and restore selectedItem
      if (selection.selectedItem) {
        const item = selection.selectedItem;
        
        // Validate the selection exists in the loaded lesson
        let isValid = false;
        
        if (item.type === 'lesson' && item.id === this.lesson.id) {
          isValid = true;
        } else if (item.type === 'stage') {
          isValid = this.stages.some(stage => stage.id === item.id);
        } else if (item.type === 'substage' && item.stageId) {
          const stage = this.stages.find(s => s.id === item.stageId);
          if (stage) {
            isValid = stage.subStages.some(substage => substage.id === item.id);
          }
        }
        
        if (isValid) {
          this.selectedItem = item;
          console.log('[LessonEditor] ✅ Restored selectedItem:', item);
        } else {
          console.log('[LessonEditor] ⚠️ Stored selectedItem is invalid, using default');
        }
      }
      
      // Restore activeTab
      if (selection.activeTab && ['details', 'structure', 'script', 'content', 'preview', 'ai-assistant'].includes(selection.activeTab)) {
        this._activeTab = selection.activeTab;
        console.log('[LessonEditor] ✅ Restored activeTab:', selection.activeTab);
        
        // If preview tab and substage selected, ensure preview data is loaded
        if (this._activeTab === 'preview' && this.selectedItem.type === 'substage') {
          setTimeout(() => {
            this.ensurePreviewDataLoaded();
          }, 100);
        }
      }
    } catch (error) {
      console.warn('[LessonEditor] ⚠️ Failed to restore selection from localStorage:', error);
    }
  }

  // Stage Management
  addStage() {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      title: `New Stage ${this.stages.length + 1}`,
      type: 'trigger',
      subStages: [],
      expanded: true
    };
    this.stages.push(newStage);
    this.selectedItem = { type: 'stage', id: newStage.id };
    this.markAsChanged();
  }

  deleteStage(stageId: string, event: Event) {
    event.stopPropagation();
    const confirmed = confirm('Delete this stage and all its sub-stages?');
    if (!confirmed) return;
    this.stages = this.stages.filter(s => s.id !== stageId);
    if (this.selectedItem?.type === 'stage' && this.selectedItem.id === stageId) {
      this.selectedItem = { type: 'lesson', id: this.lesson?.id || '' };
    }
    this.markAsChanged();
  }

  toggleStageExpanded(stageId: string, event: Event) {
    event.stopPropagation();
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.expanded = !stage.expanded;
    }
  }

  // Sub-stage Management
  addSubStage(stageId: string) {
    const stage = this.stages.find(s => s.id === stageId);
    if (!stage) return;
    const newSubStage: SubStage = {
      id: `substage-${Date.now()}`,
      title: `New Sub-stage ${stage.subStages.length + 1}`,
      type: 'intro',
      duration: 5,
      scriptBlocks: []
    };
    stage.subStages.push(newSubStage);
    this.selectedItem = { type: 'substage', id: newSubStage.id, stageId: stage.id };
    this.markAsChanged();
  }

  deleteSubStage(stageId: string, substageId: string, event: Event) {
    event.stopPropagation();
    const confirmed = confirm('Delete this sub-stage?');
    if (!confirmed) return;
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.subStages = stage.subStages.filter(ss => ss.id !== substageId);
      if (this.selectedItem?.type === 'substage' && this.selectedItem.id === substageId) {
        this.selectedItem = { type: 'stage', id: stageId };
      }
      this.markAsChanged();
    }
  }

  // Script Blocks
  addScriptBlock() {
    const substage = this.getSelectedSubStage();
    if (!substage) {
      alert('Please select a sub-stage first');
      return;
    }
    if (!substage.scriptBlocks) {
      substage.scriptBlocks = [];
    }
    
    // Calculate next available time period (10 seconds after the last block ends)
    let nextStartTime = 0;
    if (substage.scriptBlocks.length > 0) {
      // Find the maximum end time among all blocks
      const maxEndTime = Math.max(...substage.scriptBlocks.map(block => block.endTime || block.startTime || 0));
      nextStartTime = maxEndTime;
    }
    
    // Ensure unique ID by checking against existing blocks
    const existingIds = new Set(substage.scriptBlocks.map(b => b.id));
    let newBlockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let counter = 0;
    while (existingIds.has(newBlockId)) {
      counter++;
      newBlockId = `block-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    const newBlock: ScriptBlock = {
      id: newBlockId,
      type: 'teacher_talk',
      content: '',
      startTime: nextStartTime,
      endTime: nextStartTime + 10,
      autoProgressAtEnd: true // Default to auto-progress enabled
    };
    substage.scriptBlocks.push(newBlock);
    this.markAsChanged();
  }

  /**
   * Restore selection after loading lesson data
   */
  restoreSelection(preservedSelection: {type: 'lesson' | 'stage' | 'substage', id: string, stageId?: string}) {
    // Wait a tick for Angular to finish rendering
    setTimeout(() => {
      if (preservedSelection.type === 'substage' && preservedSelection.stageId) {
        // Try to find and restore the substage selection
        const stage = this.stages.find(s => s.id === preservedSelection.stageId);
        if (stage) {
          const substage = stage.subStages.find(ss => ss.id === preservedSelection.id);
          if (substage) {
            this.selectedItem = {
              type: 'substage',
              id: preservedSelection.id,
              stageId: preservedSelection.stageId
            };
            console.log('[LessonEditor] ✅ Restored substage selection:', this.selectedItem);
            return;
          }
        }
      } else if (preservedSelection.type === 'stage') {
        // Try to find and restore the stage selection
        const stage = this.stages.find(s => s.id === preservedSelection.id);
        if (stage) {
          this.selectedItem = {
            type: 'stage',
            id: preservedSelection.id
          };
          console.log('[LessonEditor] ✅ Restored stage selection:', this.selectedItem);
          return;
        }
      }
      
      // If we couldn't restore the exact selection, keep current or default to lesson
      if (this.selectedItem.type === 'lesson' || !this.selectedItem.id) {
        this.selectedItem = { type: 'lesson', id: this.lesson?.id || '' };
      }
      console.log('[LessonEditor] ⚠️ Could not restore exact selection, kept current:', this.selectedItem);
    }, 0);
  }

  deleteScriptBlock(index: number) {
    const substage = this.getSelectedSubStage();
    if (!substage || !substage.scriptBlocks) return;
    const confirmed = confirm('Delete this script block?');
    if (!confirmed) return;
    substage.scriptBlocks.splice(index, 1);
    this.markAsChanged();
  }

  onSnackDurationChange(value: number | null, block: ScriptBlock): void {
    if (value === null || value === undefined || value === 0 || isNaN(value)) {
      block.snackDuration = undefined;
    } else {
      // Round to whole number before converting to milliseconds
      const wholeSeconds = Math.round(value);
      block.snackDuration = wholeSeconds * 1000; // Convert seconds to milliseconds
    }
    this.markAsChanged();
  }

  onOpenChatUIChange(value: boolean, block: ScriptBlock): void {
    block.openChatUI = value;
    if (value && block.minimizeChatUI) {
      // If opening chat UI, uncheck minimize
      block.minimizeChatUI = false;
    }
    this.markAsChanged();
  }

  onMinimizeChatUIChange(value: boolean, block: ScriptBlock): void {
    block.minimizeChatUI = value;
    if (value && block.openChatUI) {
      // If minimizing chat UI, uncheck open
      block.openChatUI = false;
    }
    this.markAsChanged();
  }

  // Content Processing
  openContentProcessor() {
    this.showContentProcessor = true;
  }

  closeContentProcessor() {
    this.showContentProcessor = false;
  }

  openPdfModal() {
    this.showPdfModal = true;
  }

  closePdfModal() {
    this.showPdfModal = false;
  }

  openTextModal() {
    this.showTextModal = true;
  }

  closeTextModal() {
    this.showTextModal = false;
  }

  openImageModal() {
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
  }

  openApprovalQueue() {
    this.showApprovalQueue = true;
  }

  closeApprovalQueue() {
    this.showApprovalQueue = false;
  }

  searchContentLibrary() {
    this.showContentLibrary = true;
  }

  closeContentLibrary() {
    this.showContentLibrary = false;
  }

  changeInteractionType() {
    console.log('[LessonEditor] 🔄 Change interaction type clicked');
    
    // Load available interaction types
    this.http.get<any[]>(`${environment.apiUrl}/interaction-types`).subscribe({
      next: (types) => {
        console.log('[LessonEditor] ✅ Loaded interaction types:', types.length);
        this.availableInteractionTypes = types;
        this.showInteractionTypeModal = true;
        
        // Hide page header
        const header = document.querySelector('app-header');
        if (header) (header as HTMLElement).style.display = 'none';
        document.body.style.overflow = 'hidden';
      },
      error: (error) => {
        console.error('[LessonEditor] ❌ Failed to load interaction types:', error);
        this.showSnackbar('Failed to load interaction types', 'error');
      }
    });
  }
  
  selectInteractionType(interactionType: any) {
    console.log('[LessonEditor] ✅ Selected interaction type:', interactionType.id);
    const substage = this.getSelectedSubStage();
    if (substage) {
      // Update the interaction
      substage.interaction = {
        id: interactionType.id,
        type: interactionType.id,
        name: interactionType.name,
        category: interactionType.interactionTypeCategory || 'legacy',
        contentOutputId: undefined,
        config: {}
      } as any;
      this.markAsChanged();
      this.showSnackbar(`Interaction type set to: ${interactionType.name}`, 'success');
    }
    this.closeInteractionTypeModal();
  }
  
  closeInteractionTypeModal() {
    this.showInteractionTypeModal = false;
    this.availableInteractionTypes = [];
    
    // Restore page header
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
    document.body.style.overflow = '';
  }
  
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'html': 'HTML',
      'pixijs': 'PixiJS',
      'iframe': 'iFrame',
      'legacy': 'Legacy'
    };
    return labels[category] || category;
  }

  openProcessedContentPicker(context: 'structure' | 'interaction') {
    const substage = this.getSelectedSubStage();
    if (!substage) {
      this.showSnackbar('Select a substage first', 'error');
      return;
    }
    if (context === 'interaction' && !substage.interaction) {
      this.showSnackbar('Add an interaction before selecting processed content', 'error');
      return;
    }

    this.processedContentSelectionContext = context;
    this.processedContentSearchQuery = '';
    this.processedContentSearchResults = [];
    this.processedContentSearchActive = false;
    this.showProcessedContentPicker = true;

    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = 'none';
  }

  closeProcessedContentPicker() {
    this.showProcessedContentPicker = false;
    this.isProcessedContentSearching = false;
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
  }

  async searchProcessedContent() {
    const query = this.processedContentSearchQuery.trim();
    if (!query) {
      this.clearProcessedContentSearch();
      return;
    }

    this.processedContentSearchActive = true;
    this.isProcessedContentSearching = true;

    try {
      if (this.accountProcessedContentItems.length === 0) {
        const results = await firstValueFrom(
          this.http.get<ProcessedContentItem[]>(`${environment.apiUrl}/lesson-editor/processed-outputs/all`)
        );
        this.accountProcessedContentItems = results || [];
      }
      const queryLower = query.toLowerCase();
      this.processedContentSearchResults = this.accountProcessedContentItems.filter(item => {
        const title = (item.title || '').toLowerCase();
        const workflow = (item.workflowName || '').toLowerCase();
        const sourceTitle = (item.contentSource?.title || '').toLowerCase();
        return title.includes(queryLower) || workflow.includes(queryLower) || sourceTitle.includes(queryLower);
      });
    } catch (error) {
      console.error('[LessonEditor] Failed to search processed content:', error);
      this.showSnackbar('Failed to search processed content', 'error');
      this.processedContentSearchResults = [];
    } finally {
      this.isProcessedContentSearching = false;
    }
  }

  clearProcessedContentSearch() {
    this.processedContentSearchQuery = '';
    this.processedContentSearchActive = false;
    this.processedContentSearchResults = [];
    this.isProcessedContentSearching = false;
  }

  selectProcessedContentItem(item: ProcessedContentItem) {
    const substage = this.getSelectedSubStage();
    if (!substage) {
      this.showSnackbar('Select a substage first', 'error');
      return;
    }

    const normalizedId = item.id;
    substage.contentOutputId = normalizedId;

    if (this.processedContentSelectionContext === 'interaction') {
      if (!substage.interaction) {
        this.showSnackbar('Add an interaction before selecting processed content', 'error');
        return;
      }
      substage.interaction.contentOutputId = normalizedId;
      console.log('[LessonEditor] ✅ Linked processed content to interaction:', {
        substageId: substage.id,
        substageTitle: substage.title,
        interactionType: substage.interaction.type,
        contentOutputId: normalizedId,
        contentTitle: item.title
      });
    } else {
      console.log('[LessonEditor] ✅ Linked processed content to substage:', {
        substageId: substage.id,
        substageTitle: substage.title,
        contentOutputId: normalizedId,
        contentTitle: item.title
      });
    }

    if (!this.processedContentItems.find(existing => existing.id === normalizedId)) {
      this.processedContentItems.push(item);
    }

    if (this.processedContentSelectionContext === 'interaction' && this.showInteractionConfigModal && substage.interaction) {
      this.loadProcessedOutputPreview(String(substage.interaction.contentOutputId), substage.interaction.type);
    }

    // Check if this is a media interaction and update script block timing if needed
    console.log('[LessonEditor] Checking for media interaction:', {
      context: this.processedContentSelectionContext,
      interactionType: substage.interaction?.type,
      contentOutputId: normalizedId
    });
    
    if (this.processedContentSelectionContext === 'interaction' && substage.interaction?.type === 'uploaded-media') {
      console.log('[LessonEditor] Media interaction detected, checking script block timing...');
      this.checkAndUpdateScriptBlockTimingForMedia(normalizedId, substage).catch(error => {
        console.error('[LessonEditor] Error in checkAndUpdateScriptBlockTimingForMedia:', error);
      });
    } else {
      console.log('[LessonEditor] Not a media interaction or wrong context:', {
        isInteractionContext: this.processedContentSelectionContext === 'interaction',
        interactionType: substage.interaction?.type
      });
    }

    this.markAsChanged();
    this.showSnackbar('Processed content linked to substage', 'success');
    this.closeProcessedContentPicker();
  }

  /**
   * Check if video duration exceeds script block time and update if needed
   */
  async checkAndUpdateScriptBlockTimingForMedia(contentOutputId: string, substage: any) {
    try {
      console.log('[LessonEditor] 🎬 Starting script block timing check for media:', contentOutputId);
      
      // Fetch processed output to get video duration
      const processedOutput = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`));
      
      console.log('[LessonEditor] Processed output received:', {
        hasOutputData: !!processedOutput?.outputData,
        outputType: processedOutput?.outputType
      });
      
      if (!processedOutput?.outputData) {
        console.log('[LessonEditor] No output data found for processed content');
        return;
      }

      const outputData = processedOutput.outputData;
      const mediaType = outputData.mediaFileType || outputData.mediaType;
      
      console.log('[LessonEditor] Media type detected:', mediaType);
      
      // Only proceed if it's a video or audio file
      if (mediaType !== 'video' && mediaType !== 'audio') {
        console.log('[LessonEditor] Not a video or audio file, skipping timing update');
        return;
      }

      // Get video duration from metadata or outputData
      // Check multiple possible locations for duration (backend stores it as mediaFileDuration)
      let videoDuration = outputData.mediaFileDuration 
        || outputData.duration 
        || outputData.metadata?.duration 
        || outputData.videoDuration 
        || outputData.mediaDuration
        || outputData.metadata?.videoDuration
        || outputData.metadata?.mediaDuration;
      
      console.log('[LessonEditor] Video duration from metadata:', videoDuration, 'seconds');
      
      // If duration is not in outputData, try to get it from the media file
      if (!videoDuration && (outputData.mediaFileUrl || outputData.filePath)) {
        // For MinIO/S3 URLs, use the backend proxy endpoint
        let mediaUrl = outputData.mediaFileUrl;
        if (mediaUrl && (mediaUrl.startsWith('http://localhost:9000') || mediaUrl.startsWith('https://'))) {
          // Use backend proxy for MinIO/S3 files
          mediaUrl = `${environment.apiUrl}/content-sources/processed-content/${contentOutputId}/file`;
        } else if (outputData.filePath && !mediaUrl) {
          // Fallback to filePath if mediaFileUrl is not available
          mediaUrl = `${environment.apiUrl}/content-sources/processed-content/${contentOutputId}/file`;
        }
        
        if (mediaUrl) {
          videoDuration = await this.getVideoDurationFromUrl(mediaUrl);
        }
      }

      if (!videoDuration || videoDuration <= 0) {
        console.log('[LessonEditor] Could not determine video duration');
        return;
      }

      // Find the load_interaction script block for this sub-stage
      const scriptBlocks = substage.scriptBlocks || [];
      console.log('[LessonEditor] Script blocks found:', scriptBlocks.length, scriptBlocks.map((b: any) => b.type));
      
      const loadInteractionBlock = scriptBlocks.find((block: any) => block.type === 'load_interaction');
      
      if (!loadInteractionBlock) {
        console.log('[LessonEditor] ⚠️ No load_interaction script block found - cannot update timing');
        return;
      }
      
      console.log('[LessonEditor] Found load_interaction block:', {
        startTime: loadInteractionBlock.startTime,
        endTime: loadInteractionBlock.endTime
      });

      // Check if video duration exceeds the script block's endTime
      const currentEndTime = loadInteractionBlock.endTime || 0;
      const videoDurationSeconds = Math.ceil(videoDuration); // Round up to nearest second
      
      console.log('[LessonEditor] Comparing durations:', {
        videoDuration: videoDurationSeconds,
        currentEndTime: currentEndTime,
        needsUpdate: videoDurationSeconds > currentEndTime
      });

      if (videoDurationSeconds > currentEndTime) {
        // Update the endTime to accommodate the video
        const oldEndTime = loadInteractionBlock.endTime;
        loadInteractionBlock.endTime = videoDurationSeconds;
        
        // Also update startTime of subsequent blocks if needed to prevent overlap
        const currentBlockIndex = scriptBlocks.indexOf(loadInteractionBlock);
        if (currentBlockIndex < scriptBlocks.length - 1) {
          const nextBlock = scriptBlocks[currentBlockIndex + 1];
          if (nextBlock.startTime <= loadInteractionBlock.endTime) {
            nextBlock.startTime = loadInteractionBlock.endTime;
          }
        }

        this.markAsChanged();
        
        const timeAdded = videoDurationSeconds - oldEndTime;
        const timeAddedFormatted = this.formatTime(timeAdded);
        this.showSnackbar(
          `Script block time updated: Added ${timeAddedFormatted} to accommodate video duration (${this.formatTime(videoDurationSeconds)})`,
          'info'
        );
        
        console.log(`[LessonEditor] ✅ Updated script block endTime from ${this.formatTime(oldEndTime)} to ${this.formatTime(videoDurationSeconds)} for video duration`);
      }
    } catch (error: any) {
      console.error('[LessonEditor] Error checking/updating script block timing:', error);
      // Don't show error to user as this is a background operation
    }
  }

  /**
   * Validate and correct script block timing for media interactions
   * Called when user manually edits the endTime of a load_interaction block
   * Returns the corrected endTime if adjustment was needed, otherwise returns null
   */
  async validateAndCorrectMediaInteractionTiming(block: ScriptBlock, newEndTime: number, inputElement?: HTMLInputElement): Promise<number | null> {
    const substage = this.getSelectedSubStage();
    if (!substage || !substage.interaction) {
      console.log('[LessonEditor] ⚠️ No substage or interaction found');
      return null;
    }
    
    console.log('[LessonEditor] 🔍 Checking interaction type:', substage.interaction.type);
    console.log('[LessonEditor] 🔍 Checking interaction category:', substage.interaction.category);
    
    // Only check for uploaded-media interactions (check both type and category)
    const isMediaInteraction = substage.interaction.type === 'uploaded-media' 
      || substage.interaction.category === 'uploaded-media'
      || (substage.interaction.type && substage.interaction.type.includes('media'));
    
    if (!isMediaInteraction) {
      console.log('[LessonEditor] ⚠️ Not an uploaded-media interaction, skipping validation. Type:', substage.interaction.type, 'Category:', substage.interaction.category);
      return null;
    }
    
    // Check multiple locations for contentOutputId (including nested config fields)
    const config = substage.interaction.config || {};
    const contentOutputId = substage.interaction.contentOutputId 
      || substage.contentOutputId 
      || config.contentOutputId
      || config.testMediaContentId
      || config.mediaContentId
      || (typeof config === 'object' && config !== null ? (config as any).contentOutputId : null)
      || null;
    
    console.log('[LessonEditor] 🔍 Looking for contentOutputId:', {
      'interaction.contentOutputId': substage.interaction.contentOutputId,
      'substage.contentOutputId': substage.contentOutputId,
      'interaction.config': config,
      'config.contentOutputId': config?.contentOutputId,
      'config.testMediaContentId': config?.testMediaContentId,
      'resolved': contentOutputId
    });
    
    if (!contentOutputId) {
      console.log('[LessonEditor] ⚠️ No contentOutputId found - cannot validate media duration');
      return null;
    }
    
    console.log('[LessonEditor] ✅ Found contentOutputId:', contentOutputId);
    
    try {
      console.log('[LessonEditor] 🔍 Validating media interaction timing...');
      
      // Fetch processed output to get video duration
      const processedOutput = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`));
      
      if (!processedOutput?.outputData) {
        return null;
      }
      
      const outputData = processedOutput.outputData;
      const mediaType = outputData.mediaFileType || outputData.mediaType;
      
      if (mediaType !== 'video' && mediaType !== 'audio') {
        return null;
      }
      
      // Get video duration - check multiple possible locations (prioritize top-level duration)
      let videoDuration: number | null = outputData.duration 
        || outputData.mediaFileDuration 
        || outputData.mediaMetadata?.duration
        || outputData.metadata?.duration 
        || outputData.videoDuration 
        || outputData.mediaDuration
        || outputData.metadata?.videoDuration
        || outputData.metadata?.mediaDuration
        || null;
      
      console.log('[LessonEditor] 🎬 Video duration from outputData:', {
        duration: outputData.duration,
        mediaFileDuration: outputData.mediaFileDuration,
        mediaMetadataDuration: outputData.mediaMetadata?.duration,
        metadataDuration: outputData.metadata?.duration,
        resolved: videoDuration,
        fullOutputData: JSON.stringify(outputData, null, 2)
      });
      
      // If duration not in metadata, try to load from file
      if (!videoDuration && (outputData.mediaFileUrl || outputData.filePath)) {
        let mediaUrl = outputData.mediaFileUrl;
        if (mediaUrl && (mediaUrl.startsWith('http://localhost:9000') || mediaUrl.startsWith('https://'))) {
          mediaUrl = `${environment.apiUrl}/content-sources/processed-content/${contentOutputId}/file`;
        } else if (outputData.filePath && !mediaUrl) {
          mediaUrl = `${environment.apiUrl}/content-sources/processed-content/${contentOutputId}/file`;
        }
        
        if (mediaUrl) {
          const fetchedDuration = await this.getVideoDurationFromUrl(mediaUrl);
          if (fetchedDuration !== null && fetchedDuration !== undefined) {
            videoDuration = fetchedDuration;
          }
        }
      }
      
      if (!videoDuration || videoDuration <= 0) {
        return null;
      }
      
      const videoDurationSeconds = Math.ceil(videoDuration);
      
      // Calculate the script block duration (endTime - startTime)
      const scriptBlockDuration = newEndTime - block.startTime;
      
      console.log('[LessonEditor] 🎬 Duration check:', {
        'newEndTime': newEndTime,
        'block.startTime': block.startTime,
        'scriptBlockDuration': scriptBlockDuration,
        'videoDurationSeconds': videoDurationSeconds,
        'needsCorrection': scriptBlockDuration < videoDurationSeconds
      });
      
      // If script block duration is less than video duration, correct it
      if (scriptBlockDuration < videoDurationSeconds) {
        console.log(`[LessonEditor] ⚠️ Script block duration (${scriptBlockDuration}s) is less than video duration (${videoDurationSeconds}s), correcting...`);
        
        // Ensure minimum duration is maintained (5 seconds) and video duration is met
        // The endTime needs to be at least (startTime + videoDuration), but also at least (startTime + 5)
        const minEndTime = Math.max(block.startTime + videoDurationSeconds, block.startTime + 5);
        
        // Update subsequent blocks to prevent overlap
        const scriptBlocks = substage.scriptBlocks || [];
        const currentBlockIndex = scriptBlocks.indexOf(block);
        if (currentBlockIndex < scriptBlocks.length - 1) {
          const nextBlock = scriptBlocks[currentBlockIndex + 1];
          if (nextBlock.startTime <= minEndTime) {
            nextBlock.startTime = minEndTime;
          }
        }
        
        const timeAdded = minEndTime - newEndTime;
        const timeAddedFormatted = this.formatTime(timeAdded);
        this.showSnackbar(
          `Script block time corrected: Added ${timeAddedFormatted} to accommodate video duration (${this.formatTime(minEndTime)})`,
          'info'
        );
        
        // Force change detection to show snackbar
        this.cdr.detectChanges();
        
        return minEndTime; // Return the corrected endTime
      }
      
      return null; // No correction needed
    } catch (error: any) {
      console.error('[LessonEditor] Error validating media interaction timing:', error);
      return null;
    }
  }

  /**
   * Get video duration from URL by loading the media element
   */
  private async getVideoDurationFromUrl(url: string): Promise<number | null> {
    return new Promise((resolve) => {
      try {
        // Create a temporary video element
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = url;
        
        video.addEventListener('loadedmetadata', () => {
          const duration = video.duration;
          video.remove();
          resolve(duration);
        });
        
        video.addEventListener('error', () => {
          video.remove();
          resolve(null);
        });
        
        // Set a timeout in case the video doesn't load
        setTimeout(() => {
          video.remove();
          resolve(null);
        }, 5000);
      } catch (error) {
        resolve(null);
      }
    });
  }

  get processedContentPickerList(): ProcessedContentItem[] {
    if (this.processedContentSearchActive) {
      return this.processedContentSearchResults;
    }
    return this.processedContentItems;
  }

  /**
   * Check if there's actually a pending draft on the server (different from current)
   */
  hasPendingDraftOnServer(): boolean {
    // Show button if:
    // 1. We're currently showing pending changes (so user can toggle back to current state)
    if (this.showingPendingChanges) {
      // If we're showing pending changes, always show the button so user can toggle back
      return true;
    }
    
    // If not showing pending changes, check if we have pending draft data WITH actual changes
    if (!this.hasPendingDraft || !this.pendingDraftData) {
      return false;
    }
    
    // Check if there are actual changes - if changesCount is 0 or undefined, don't show button
    // We need to check the draft status to see if it has changes
    // For now, if we have pending draft data, assume there are changes
    // But we should verify this by checking the draft's changesCount if available
    return true;
  }

  private async refreshPendingDraftStatus(): Promise<boolean> {
    if (!this.lesson?.id) {
      this.hasPendingDraft = false;
      this.pendingDraftData = null;
      return false;
    }

    try {
      // Get all pending drafts for this lesson to check count
      // Try the /all endpoint first, fallback to single draft endpoint
      let allDrafts: any[] = [];
      try {
        allDrafts = await firstValueFrom(
          this.http.get<any[]>(`${environment.apiUrl}/lesson-drafts/lesson/${this.lesson.id}/all`, {
            headers: {
              'x-tenant-id': environment.tenantId,
              'x-user-id': environment.defaultUserId
            }
          }).pipe(
            catchError(() => {
              // Fallback to single draft endpoint
              if (!this.lesson?.id) {
                return of([]);
              }
              return this.http.get<any>(`${environment.apiUrl}/lesson-drafts/lesson/${this.lesson.id}`, {
                headers: {
                  'x-tenant-id': environment.tenantId,
                  'x-user-id': environment.defaultUserId
                }
              }).pipe(
                map(draft => draft && draft.status === 'pending' ? [draft] : []),
                catchError(() => of([]))
              );
            })
          )
        );
      } catch (error) {
        // If /all doesn't exist, try single draft endpoint
        if (!this.lesson?.id) {
          allDrafts = [];
        } else {
          const singleDraft = await firstValueFrom(
            this.http.get<any>(`${environment.apiUrl}/lesson-drafts/lesson/${this.lesson.id}`, {
              headers: {
                'x-tenant-id': environment.tenantId,
                'x-user-id': environment.defaultUserId
              }
            }).pipe(
              map(draft => draft && draft.status === 'pending' ? [draft] : []),
              catchError(() => of([]))
            )
          );
          allDrafts = singleDraft;
        }
      }

      const pendingDrafts = (allDrafts || []).filter((d: any) => d.status === 'pending');
      const pendingCount = pendingDrafts.length;

      console.log('[LessonEditor] Found pending drafts:', pendingCount);

      if (pendingCount === 0) {
        this.hasPendingDraft = false;
        this.pendingDraftData = null;
        this.hasContentChanges = false;
        return false;
      }

      // Get the most recent pending draft
      const latestDraft = pendingDrafts.sort((a: any, b: any) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];

      // Only set as pending if the draft has actual changes
      if (latestDraft.changesCount && latestDraft.changesCount > 0) {
        this.hasPendingDraft = true;
        this.pendingDraftData = latestDraft.draftData;
        this.currentDraftId = latestDraft.id; // CRITICAL: Set currentDraftId so publish can find it
        this.hasDraft = true; // Mark that we have a draft
        
        // Check if draft has content changes by getting the diff
        try {
          const diff = await firstValueFrom(
            this.http.get<any>(`${environment.apiUrl}/lesson-drafts/${latestDraft.id}/diff`, {
              headers: {
                'x-tenant-id': environment.tenantId,
                'x-user-id': environment.defaultUserId
              }
            }).pipe(
              catchError(() => of({ hasContentChanges: false }))
            )
          );
          this.hasContentChanges = diff.hasContentChanges || false;
          console.log('[LessonEditor] Draft has content changes:', this.hasContentChanges);
        } catch (error) {
          console.error('[LessonEditor] Failed to check content changes:', error);
          this.hasContentChanges = false; // Default to false if we can't check
        }
        this.lastSaved = latestDraft.createdAt ? new Date(latestDraft.createdAt) : this.lastSaved;
      } else {
        // No actual changes, so no pending draft
        this.hasPendingDraft = false;
        this.pendingDraftData = null;
      }

      // Only show warning if there are 2+ pending drafts (meaning there's an older one to discard)
      // If there's only 1 pending draft and it's the one we just created, don't warn
      if (pendingCount === 1 && this.currentDraftId) {
        const draftId = latestDraft.id || latestDraft.draftId;
        if (String(draftId) === String(this.currentDraftId)) {
          console.log('[LessonEditor] Only one pending draft (the current one), no warning needed');
          return false; // Don't show warning
        }
      }

      // 2+ pending drafts exist, show warning
      if (pendingCount >= 2) {
        // Store older draft IDs for potential discarding
        this.olderDraftIds = pendingDrafts
          .filter((d: any) => {
            const draftId = d.id || d.draftId;
            return draftId && String(draftId) !== String(this.currentDraftId);
          })
          .map((d: any) => d.id || d.draftId);
        console.log('[LessonEditor] Multiple pending drafts found, will show warning. Older drafts:', this.olderDraftIds);
        return true; // Show warning
      }

      return false;
    } catch (error) {
      console.error('[LessonEditor] Failed to refresh pending draft status:', error);
      return this.hasPendingDraft;
    }
  }

  // AI Assistant
  sendAIMessage() {
    console.log('[LessonEditor] 🤖 Sending AI message:', this.aiMessage);
    // TODO: Implement AI chat
    alert('AI Assistant - To be implemented');
    this.aiMessage = '';
  }

  // Drag & Drop
  onStageDragStart(stage: Stage, event: DragEvent) {
    console.log('[LessonEditor] 🎯 Drag start:', stage.id);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', stage.id);
  }

  onStageDragOver(stageId: string, event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onStageDragLeave() {
    // Drag leave handling
  }

  onStageDrop(targetStage: Stage, event: DragEvent) {
    event.preventDefault();
    const sourceStageId = event.dataTransfer!.getData('text/plain');
    console.log('[LessonEditor] 📍 Drop', sourceStageId, 'on:', targetStage.id);
    // TODO: Implement stage reordering
  }

  onSubStageDragStart(substage: SubStage, stageId: string, event: DragEvent) {
    console.log('[LessonEditor] 🎯 Sub-stage drag start:', substage.id);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', JSON.stringify({ stageId, substageId: substage.id }));
  }

  onSubStageDragOver(substageId: string, event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
  }

  onSubStageDragLeave() {
    // Drag leave handling
  }

  onSubStageDrop(targetSubstage: SubStage, stageId: string, event: DragEvent) {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer!.getData('text/plain'));
    console.log('[LessonEditor] 📍 Drop sub-stage', data, 'on:', targetSubstage.id);
    // TODO: Implement sub-stage reordering
  }

  // Script Block Drag & Drop
  onScriptBlockDragStart(block: ScriptBlock, index: number, event: DragEvent) {
    console.log('[LessonEditor] 🎯 Script block drag start:', index);
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', index.toString());
    this.draggedScriptBlockIndex = index;
  }

  onScriptBlockDragOver(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    this.dragOverScriptBlockIndex = targetIndex;
  }

  onScriptBlockDragLeave() {
    this.dragOverScriptBlockIndex = null;
  }

  onScriptBlockDrop(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    const sourceIndex = parseInt(event.dataTransfer!.getData('text/plain'), 10);
    this.dragOverScriptBlockIndex = null;
    
    if (this.draggedScriptBlockIndex === null || sourceIndex === targetIndex) {
      this.draggedScriptBlockIndex = null;
      return;
    }

    const substage = this.getSelectedSubStage();
    if (!substage || !substage.scriptBlocks) {
      this.draggedScriptBlockIndex = null;
      return;
    }

    console.log('[LessonEditor] 📍 Drop script block', sourceIndex, 'to:', targetIndex);
    
    // Reorder script blocks
    const blocks = substage.scriptBlocks;
    const [movedBlock] = blocks.splice(sourceIndex, 1);
    blocks.splice(targetIndex, 0, movedBlock);
    
    // Recalculate times to preserve top-to-bottom chronology
    const timesUpdated = this.recalculateScriptBlockTimes(substage.scriptBlocks);
    
    this.draggedScriptBlockIndex = null;
    this.markAsChanged();
    
    if (timesUpdated) {
      this.showSnackbar('Time period updated to preserve chronology', 'info');
    } else {
      this.showSnackbar('Script blocks reordered', 'success');
    }
  }

  /**
   * Recalculate script block times to preserve top-to-bottom chronology
   * Blocks are updated to maintain sequential order regardless of type
   */
  private recalculateScriptBlockTimes(blocks: ScriptBlock[]): boolean {
    let timesUpdated = false;
    
    // Preserve top-to-bottom chronology - each block starts after the previous one ends
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const previousBlock = i > 0 ? blocks[i - 1] : null;
      
      if (previousBlock) {
        const previousEndTime = previousBlock.endTime || previousBlock.startTime;
        const currentDuration = (block.endTime || block.startTime) - (block.startTime || 0) || 10;
        
        // If this block starts before the previous one ends, adjust it
        if (block.startTime < previousEndTime) {
          block.startTime = previousEndTime;
          block.endTime = block.startTime + currentDuration;
          timesUpdated = true;
        }
      } else {
        // First block - ensure it starts at 0
        if (block.startTime !== 0) {
          const duration = (block.endTime || block.startTime) - (block.startTime || 0) || 10;
          block.startTime = 0;
          block.endTime = duration;
          timesUpdated = true;
        }
      }
    }
    
    return timesUpdated;
  }

  toggleScriptBlockCollapseByIndex(blockIndex: number, event?: Event): void {
    // Stop event propagation immediately
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // CRITICAL: blockIndex is required - we use it exclusively to identify which block to toggle
    if (blockIndex === undefined || blockIndex < 0) {
      console.warn('[LessonEditor] ⚠️ Invalid blockIndex in toggleScriptBlockCollapseByIndex:', blockIndex);
      return;
    }
    
    // Verify the block exists in the actual array using ONLY the index
    const substage = this.getSelectedSubStage();
    if (!substage || !substage.scriptBlocks) {
      console.warn('[LessonEditor] ⚠️ No substage or script blocks available');
      return;
    }
    
    // Verify index is within bounds
    if (blockIndex >= substage.scriptBlocks.length) {
      console.warn('[LessonEditor] ⚠️ Block index out of bounds:', blockIndex, 'Array length:', substage.scriptBlocks.length);
      return;
    }
    
    // Get the block at the exact index - this is the ONLY block we will toggle
    const actualBlock = substage.scriptBlocks[blockIndex];
    if (!actualBlock || !actualBlock.id) {
      console.warn('[LessonEditor] ⚠️ Block not found at index:', blockIndex);
      return;
    }
    
    const blockId = actualBlock.id;
    
    // Prevent multiple simultaneous toggles
    if (this.isTogglingBlock === blockId) {
      console.log('[LessonEditor] ⚠️ Block toggle already in progress for:', blockId);
      return;
    }
    
    // Set flag to prevent duplicate toggles
    this.isTogglingBlock = blockId;
    
    // Only toggle the specific block at this exact index
    const wasCollapsed = this.collapsedScriptBlocks.has(blockId);
    console.log('[LessonEditor] 🔄 Toggling collapse for block at index:', blockIndex, 'ID:', blockId, 'Was collapsed:', wasCollapsed);
    console.log('[LessonEditor] 🔍 All blocks before toggle:', substage.scriptBlocks.map((b, idx) => ({ index: idx, id: b.id, collapsed: this.collapsedScriptBlocks.has(b.id) })));
    
    // Toggle immediately - only this specific block
    if (wasCollapsed) {
      this.collapsedScriptBlocks.delete(blockId);
    } else {
      this.collapsedScriptBlocks.add(blockId);
    }
    
    console.log('[LessonEditor] ✅ Collapsed blocks after toggle:', Array.from(this.collapsedScriptBlocks));
    console.log('[LessonEditor] 🔍 All blocks after toggle:', substage.scriptBlocks.map((b, idx) => ({ index: idx, id: b.id, collapsed: this.collapsedScriptBlocks.has(b.id) })));
    
    // Clear the flag after a short delay
    setTimeout(() => {
      this.isTogglingBlock = null;
    }, 100);
  }

  // Legacy method for backwards compatibility (if needed)
  toggleScriptBlockCollapse(block: ScriptBlock, event?: Event, blockIndex?: number): void {
    // Stop event propagation immediately to prevent triggering collapse on parent elements
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // CRITICAL: blockIndex is required - we use it exclusively to identify which block to toggle
    if (blockIndex === undefined || blockIndex < 0) {
      console.warn('[LessonEditor] ⚠️ Invalid blockIndex in toggleScriptBlockCollapse:', blockIndex);
      return;
    }
    
    // Verify the block exists in the actual array using ONLY the index
    const substage = this.getSelectedSubStage();
    if (!substage || !substage.scriptBlocks) {
      console.warn('[LessonEditor] ⚠️ No substage or script blocks available');
      return;
    }
    
    // Verify index is within bounds
    if (blockIndex >= substage.scriptBlocks.length) {
      console.warn('[LessonEditor] ⚠️ Block index out of bounds:', blockIndex, 'Array length:', substage.scriptBlocks.length);
      return;
    }
    
    // Get the block at the exact index - this is the ONLY block we will toggle
    const actualBlock = substage.scriptBlocks[blockIndex];
    if (!actualBlock || !actualBlock.id) {
      console.warn('[LessonEditor] ⚠️ Block not found at index:', blockIndex);
      return;
    }
    
    const blockId = actualBlock.id;
    
    // Prevent multiple simultaneous toggles
    if (this.isTogglingBlock === blockId) {
      console.log('[LessonEditor] ⚠️ Block toggle already in progress for:', blockId);
      return;
    }
    
    // Set flag to prevent duplicate toggles
    this.isTogglingBlock = blockId;
    
    // Only toggle the specific block at this exact index
    const wasCollapsed = this.collapsedScriptBlocks.has(blockId);
    console.log('[LessonEditor] 🔄 Toggling collapse for block at index:', blockIndex, 'ID:', blockId, 'Was collapsed:', wasCollapsed);
    console.log('[LessonEditor] 🔍 All blocks before toggle:', substage.scriptBlocks.map((b, idx) => ({ index: idx, id: b.id, collapsed: this.collapsedScriptBlocks.has(b.id) })));
    
    // Toggle immediately - only this specific block
    if (wasCollapsed) {
      this.collapsedScriptBlocks.delete(blockId);
    } else {
      this.collapsedScriptBlocks.add(blockId);
    }
    
    console.log('[LessonEditor] ✅ Collapsed blocks after toggle:', Array.from(this.collapsedScriptBlocks));
    console.log('[LessonEditor] 🔍 All blocks after toggle:', substage.scriptBlocks.map((b, idx) => ({ index: idx, id: b.id, collapsed: this.collapsedScriptBlocks.has(b.id) })));
    
    // Clear the flag after a short delay
    setTimeout(() => {
      this.isTogglingBlock = null;
    }, 100);
  }

  isScriptBlockCollapsed(blockId: string): boolean {
    if (!blockId) {
      console.warn('[LessonEditor] ⚠️ isScriptBlockCollapsed called with empty blockId');
      return false;
    }
    const isCollapsed = this.collapsedScriptBlocks.has(blockId);
    return isCollapsed;
  }

  trackByBlockId(index: number, block: ScriptBlock): string {
    return block.id || `block-${index}`;
  }

  getBlockTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      teacher_talk: 'Teacher Talk',
      load_interaction: 'Interaction',
      pause: 'Pause'
    };
    return labels[type] || 'Block';
  }

  // Helpers
  getSelectedStage(): Stage | null {
    if (this.selectedItem?.type === 'stage') {
      return this.stages.find(s => s.id === this.selectedItem.id) || null;
    }
    if (this.selectedItem?.type === 'substage' && this.selectedItem.stageId) {
      return this.stages.find(s => s.id === this.selectedItem.stageId) || null;
    }
    return null;
  }

  getSelectedSubStage(): SubStage | null {
    if (this.selectedItem?.type === 'substage') {
      const stage = this.stages.find(s => s.id === this.selectedItem.stageId);
      if (stage) {
        return stage.subStages.find(ss => ss.id === this.selectedItem.id) || null;
      }
    }
    return null;
  }

  getBlockIcon(type: string): string {
    const icons: Record<string, string> = {
      teacher_talk: '💬',
      load_interaction: '🎮',
      pause: '⏸️'
    };
    return icons[type] || '📝';
  }

  getStageIcon(type: string): string {
    const icons: Record<string, string> = {
      trigger: '🎯',
      explore: '🔍',
      absorb: '📖',
      cultivate: '🌱',
      hone: '⚡'
    };
    return icons[type] || '📚';
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Parse time string (MM:SS) to seconds
   */
  parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }

  async updateTimeFromString(event: any, block: ScriptBlock, field: 'startTime' | 'endTime') {
    const input = event.target.value.trim();
    const inputElement = event.target; // Store reference to input element
    
    // Parse MM:SS format
    const timeRegex = /^(\d{1,2}):([0-5]?\d)$/;
    const match = input.match(timeRegex);
    
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSeconds = (minutes * 60) + seconds;
      
      const substage = this.getSelectedSubStage();
      if (!substage || !substage.scriptBlocks) {
        (block as any)[field] = totalSeconds;
        this.markAsChanged();
        return;
      }

      // Store original values for validation
      const originalStartTime = block.startTime;
      const originalEndTime = block.endTime;
      const originalInputValue = totalSeconds; // Store original input before any adjustments
      let newStartTime = field === 'startTime' ? totalSeconds : originalStartTime;
      let newEndTime = field === 'endTime' ? totalSeconds : originalEndTime;
      let finalValue = totalSeconds; // Use this for the final value to set

      // For load_interaction blocks with media, validate against video duration FIRST
      // This must happen BEFORE other validations so we check against the original input value
      if (field === 'endTime' && block.type === 'load_interaction') {
        const substage = this.getSelectedSubStage();
        console.log('[LessonEditor] 🎬 Checking media interaction timing FIRST (before other validations)');
        console.log('[LessonEditor] 🎬 Original input value:', originalInputValue, 'Current block.endTime:', block.endTime);
        console.log('[LessonEditor] 🎬 Substage:', substage ? 'found' : 'not found');
        console.log('[LessonEditor] 🎬 Interaction:', substage?.interaction ? JSON.stringify({ type: substage.interaction.type, category: substage.interaction.category, contentOutputId: substage.interaction.contentOutputId }) : 'not found');
        
        const correctedEndTime = await this.validateAndCorrectMediaInteractionTiming(block, originalInputValue, inputElement);
        if (correctedEndTime !== null && correctedEndTime !== undefined && correctedEndTime !== originalInputValue) {
          console.log('[LessonEditor] ✅ Media validation corrected endTime from', originalInputValue, 'to', correctedEndTime);
          newEndTime = correctedEndTime;
          finalValue = correctedEndTime;
          block.endTime = correctedEndTime; // Update block immediately
          event.target.value = this.formatTime(correctedEndTime);
          this.markAsChanged();
          this.cdr.detectChanges();
          // Don't continue with other validations since we've already corrected
          return;
        } else if (correctedEndTime === null || correctedEndTime === undefined) {
          console.log('[LessonEditor] ℹ️ Media validation returned null/undefined - not a media interaction or no correction needed');
        } else {
          console.log('[LessonEditor] ✅ Media validation passed, no correction needed (correctedEndTime === originalInputValue)');
        }
      }

      // Validation 1: Ensure endTime >= startTime
      if (newEndTime < newStartTime) {
        if (field === 'endTime') {
          // If editing endTime, set it to startTime + minimum duration
          newEndTime = newStartTime + 5;
          finalValue = newEndTime;
        } else {
          // If editing startTime, set it to endTime - minimum duration
          newStartTime = Math.max(0, newEndTime - 5);
          finalValue = newStartTime;
        }
        event.target.value = this.formatTime(finalValue);
        this.showSnackbar('End time must be after start time. Adjusted to maintain minimum duration.', 'error');
        this.markAsChanged();
        this.cdr.detectChanges();
      }

      // Validation 2: Ensure minimum 5 second duration
      const duration = newEndTime - newStartTime;
      if (duration < 5) {
        if (field === 'endTime') {
          // Extend endTime to meet minimum duration
          newEndTime = newStartTime + 5;
          finalValue = newEndTime;
        } else {
          // Adjust startTime to meet minimum duration
          newStartTime = Math.max(0, newEndTime - 5);
          finalValue = newStartTime;
        }
        event.target.value = this.formatTime(finalValue);
        console.log('[LessonEditor] ⚠️ Duration < 5 seconds, showing snackbar...');
        this.showSnackbar('Script blocks must be at least 5 seconds long. Time adjusted.', 'error');
        this.markAsChanged();
        // Force change detection to show snackbar
        this.cdr.detectChanges();
      }

      // Update the block values
      block.startTime = newStartTime;
      block.endTime = newEndTime;

      // Check for overlaps if updating startTime
      if (field === 'startTime') {
        const adjustedTime = this.adjustStartTimeForOverlap(block, finalValue, substage.scriptBlocks);
        if (adjustedTime !== finalValue) {
          block.startTime = adjustedTime;
          block.endTime = Math.max(block.endTime, block.startTime + 5); // Ensure minimum duration
          event.target.value = this.formatTime(adjustedTime);
          this.markAsChanged();
          this.showSnackbar('Script start time updated. Script block periods cannot overlap', 'info');
          return;
        }
      } else if (field === 'endTime') {
        // Check if endTime overlaps with next block of the same type's startTime
        const blockIndex = substage.scriptBlocks.indexOf(block);
        if (blockIndex >= 0) {
          // Find the next block of the same type
          let nextSameTypeBlock: ScriptBlock | null = null;
          for (let i = blockIndex + 1; i < substage.scriptBlocks.length; i++) {
            if (substage.scriptBlocks[i].type === block.type) {
              nextSameTypeBlock = substage.scriptBlocks[i];
              break;
            }
          }
          
          if (nextSameTypeBlock && block.endTime > nextSameTypeBlock.startTime) {
            // End time would overlap with next block of same type, adjust to just before it starts
            block.endTime = nextSameTypeBlock.startTime;
            // Re-validate minimum duration after overlap adjustment
            if (block.endTime - block.startTime < 5) {
              block.startTime = Math.max(0, block.endTime - 5);
              this.showSnackbar('Script end time updated. Start time adjusted to maintain minimum 5 second duration.', 'info');
            } else {
              this.showSnackbar('Script end time updated. Script block periods cannot overlap', 'info');
            }
            event.target.value = this.formatTime(block.endTime);
            this.markAsChanged();
            return;
          }
        }
      }
      
      this.markAsChanged();
      console.log(`[LessonEditor] ⏱️ Time updated: ${input} = ${finalValue}s`);
    } else {
      // Invalid format - revert to current value
      console.warn(`[LessonEditor] ⚠️ Invalid time format: ${input}. Use MM:SS (e.g., 1:30)`);
      event.target.value = this.formatTime(block[field]);
      this.showSnackbar('Invalid time format. Use MM:SS (e.g., 1:30)', 'error');
    }
  }

  /**
   * Adjust start time to prevent overlap with other script blocks of the same type
   */
  private adjustStartTimeForOverlap(block: ScriptBlock, proposedStartTime: number, allBlocks: ScriptBlock[]): number {
    const blockIndex = allBlocks.indexOf(block);
    if (blockIndex < 0) return proposedStartTime;

    // Only check blocks of the same type
    const sameTypeBlocks = allBlocks.filter(b => b.type === block.type);
    const sameTypeIndex = sameTypeBlocks.indexOf(block);
    if (sameTypeIndex < 0) return proposedStartTime;

    // Find the previous block of the same type in the full array
    let previousSameTypeBlock: ScriptBlock | null = null;
    for (let i = blockIndex - 1; i >= 0; i--) {
      if (allBlocks[i].type === block.type) {
        previousSameTypeBlock = allBlocks[i];
        break;
      }
    }

    // Check overlap with previous block of same type
    if (previousSameTypeBlock) {
      const previousEndTime = previousSameTypeBlock.endTime || previousSameTypeBlock.startTime;
      if (proposedStartTime < previousEndTime) {
        // Overlap detected, adjust to start right after previous block of same type ends
        return previousEndTime;
      }
    }

    // Find the next block of the same type in the full array
    let nextSameTypeBlock: ScriptBlock | null = null;
    for (let i = blockIndex + 1; i < allBlocks.length; i++) {
      if (allBlocks[i].type === block.type) {
        nextSameTypeBlock = allBlocks[i];
        break;
      }
    }

    // Check overlap with next block of same type
    if (nextSameTypeBlock) {
      if (proposedStartTime >= nextSameTypeBlock.startTime) {
        // Would overlap with next block of same type
        // So we keep it at the earliest available time (after previous block of same type)
        if (previousSameTypeBlock) {
          return previousSameTypeBlock.endTime || previousSameTypeBlock.startTime;
        }
        return 0; // First block of this type, can't go earlier
      }
    }

    return proposedStartTime;
  }

  /**
   * Fix overlapping times for script blocks of the same type
   * This is called when loading lesson data to ensure no overlaps exist
   * Returns true if any overlaps were fixed
   */
  private fixScriptBlockOverlaps(blocks: ScriptBlock[]): boolean {
    if (!blocks || blocks.length === 0) {
      console.log('[LessonEditor] ⚠️ fixScriptBlockOverlaps: No blocks provided');
      return false;
    }

    console.log(`[LessonEditor] 🔧 fixScriptBlockOverlaps: Processing ${blocks.length} blocks`);
    let overlapsFixed = false;

    // Group blocks by type
    const blocksByType = new Map<string, ScriptBlock[]>();
    blocks.forEach(block => {
      const type = block.type || 'teacher_talk';
      if (!blocksByType.has(type)) {
        blocksByType.set(type, []);
      }
      blocksByType.get(type)!.push(block);
      console.log(`[LessonEditor]   Grouped block: type=${type}, startTime=${block.startTime}, endTime=${block.endTime}`);
    });

    console.log(`[LessonEditor]   Grouped into ${blocksByType.size} type groups:`, Array.from(blocksByType.keys()));

    // Fix overlaps within each type group
    blocksByType.forEach((typeBlocks, type) => {
      console.log(`[LessonEditor]   Processing ${typeBlocks.length} blocks of type "${type}"`);
      
      // Sort by startTime
      typeBlocks.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
      console.log(`[LessonEditor]   Sorted blocks:`, typeBlocks.map(b => `${b.startTime}-${b.endTime}`).join(', '));

      // Ensure no overlaps - each block starts after the previous one ends
      for (let i = 1; i < typeBlocks.length; i++) {
        const currentBlock = typeBlocks[i];
        const previousBlock = typeBlocks[i - 1];
        
        const previousEndTime = previousBlock.endTime || previousBlock.startTime || 0;
        const currentStartTime = currentBlock.startTime || 0;
        const currentEndTime = currentBlock.endTime || currentBlock.startTime || 0;
        const currentDuration = currentEndTime - currentStartTime || 10;

        console.log(`[LessonEditor]   Checking block ${i}: previousEndTime=${previousEndTime}, currentStartTime=${currentStartTime}, currentEndTime=${currentEndTime}, duration=${currentDuration}`);

        // If current block starts before or at the same time as previous block ends, adjust it
        if (currentStartTime <= previousEndTime) {
          const oldStartTime = currentBlock.startTime;
          const oldEndTime = currentBlock.endTime;
          currentBlock.startTime = previousEndTime;
          currentBlock.endTime = currentBlock.startTime + currentDuration;
          overlapsFixed = true;
          console.log(`[LessonEditor] 🔧 Fixed overlap: ${type} block ${currentBlock.id} adjusted from ${oldStartTime}-${oldEndTime} to ${currentBlock.startTime}-${currentBlock.endTime}`);
        } else {
          console.log(`[LessonEditor]   No overlap for block ${i}`);
        }
      }
    });

    console.log(`[LessonEditor]   fixScriptBlockOverlaps result: overlapsFixed=${overlapsFixed}`);
    return overlapsFixed;
  }

  markAsChanged() {
    this.hasUnsavedChanges = true;
    this.hasBeenSubmitted = false; // Reset submission status when changes are made
  }

  // Learning Objectives Management
  addLearningObjective() {
    this.learningObjectives.push('');
    this.markAsChanged();
  }

  removeLearningObjective(index: number) {
    if (this.learningObjectives.length > 0) {
      this.learningObjectives.splice(index, 1);
      this.markAsChanged();
    }
  }

  trackByObjectiveIndex(index: number, item: string): number {
    return index;
  }

  // Lesson Outcomes Management
  addLessonOutcome() {
    this.lessonOutcomes.push({ title: '', content: 'At the end of this lesson student will know...' });
    this.markAsChanged();
  }

  removeLessonOutcome(index: number) {
    if (this.lessonOutcomes.length > 0) {
      this.lessonOutcomes.splice(index, 1);
      this.markAsChanged();
    }
  }

  trackByOutcomeIndex(index: number, item: { title: string; content: string }): number {
    return index;
  }

  // Sidebar Resizing
  onResizeMouseDown(event: MouseEvent) {
    // Sidebar resize functionality - to be implemented
    event.preventDefault();
  }

  // Calculated Properties
  calculateTotalDuration(): number {
    let total = 0;
    for (const stage of this.stages) {
      for (const substage of stage.subStages) {
        total += substage.duration || 0;
      }
    }
    return total;
  }

  getTotalSubStages(): number {
    let total = 0;
    for (const stage of this.stages) {
      total += stage.subStages.length;
    }
    return total;
  }

  getStageTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      tease: 'Spark curiosity and activate schemas (TIE)',
      explore: 'Foster inquiry and pattern recognition (HUNT)',
      absorb: 'Deliver and internalize core content (SIP)',
      cultivate: 'Apply, extend, and iterate (GROW)',
      hone: 'Assess mastery and reflect (VET)'
    };
    return descriptions[type] || type;
  }

  getAvailableSubStageTypes(stageType: string | undefined | null): string[] {
    // Return TEACH-aligned substage types based on stage type
    if (!stageType) {
      return [];
    }
    return this.stageSubStageMap[stageType] || [];
  }

  getSubStageTypeLabel(type: string): string {
    // Return the label from substageTypeLabels
    return this.substageTypeLabels[type] || type;
  }

  getContentOutputName(outputId?: string | number | null): string {
    if (outputId === null || outputId === undefined) {
      return 'None';
    }
    const normalizedId = typeof outputId === 'string' ? outputId : String(outputId);
    const output = this.resolveProcessedContentById(normalizedId);
    return output?.title || output?.workflowName || 'Unknown Processed Content';
  }

  getInteractionProcessedContentLabel(): string {
    const substage = this.getSelectedSubStage();
    if (!substage) {
      return 'None';
    }
    const id = substage.interaction?.contentOutputId || substage.contentOutputId;
    return this.getContentOutputName(id);
  }

  showInteractionNotConfiguredWarning(): boolean {
    const substage = this.getSelectedSubStage();
    if (!substage?.interaction) {
      return true;
    }
    const contentId = substage.interaction.contentOutputId || substage.contentOutputId;
    if (!contentId) {
      return true;
    }
    return !this.hasValidInteractionPreviewData(this.interactionPreviewData);
  }

  private resolveProcessedContentById(id: string): ProcessedContentItem | undefined {
    return this.processedContentItems.find(item => item.id === id)
      || this.accountProcessedContentItems.find(item => item.id === id);
  }

  private hasValidInteractionPreviewData(data: any): boolean {
    if (!data) return false;
    
    // For code-based interactions (iframe/html/pixijs), check for code
    if (data.interactionCategory === 'iframe' || data.interactionCategory === 'html' || data.interactionCategory === 'pixijs') {
      return !!(data.htmlCode || data.jsCode);
    }
    
    // For legacy interactions (like true-false-selection), check for fragments
    return !!(Array.isArray(data.fragments) && data.fragments.length > 0 && data.targetStatement);
  }

  /**
   * Get source content items used in this lesson
   * Includes content sources from:
   * 1. Processed content items (content sources that have been processed)
   * 2. Directly linked content sources (e.g., iframe guide URLs that may not have processed content yet)
   * 3. Content sources linked to interactions via contentOutputId
   */
  getSourceContentForLesson(): any[] {
    // Get unique source content items from both:
    // 1. Processed content items (content sources that have been processed)
    // 2. Directly linked content sources (e.g., iframe guide URLs that may not have processed content yet)
    const sources: any[] = [];
    const seenIds = new Set<string>();
    
    // First, add content sources from processed content items
    this.processedContentItems.forEach(item => {
      if (item.contentSource && !seenIds.has(item.contentSource.id)) {
        sources.push(item.contentSource);
        seenIds.add(item.contentSource.id);
      }
    });
    
    // Then, add directly linked content sources (e.g., iframe guide URLs)
    // These may not have processed content yet but are still linked to the lesson
    this.sourceContentItems.forEach(source => {
      if (source && source.id && !seenIds.has(source.id)) {
        sources.push(source);
        seenIds.add(source.id);
      }
    });
    
    // Also check interactions for contentOutputId and find their content sources
    if (this.stages && this.stages.length > 0) {
      this.stages.forEach(stage => {
        stage.subStages.forEach(substage => {
          // Check if substage has a contentOutputId
          if (substage.contentOutputId && !seenIds.has(substage.contentOutputId)) {
            const processedItem = this.processedContentItems.find(item => item.id === substage.contentOutputId);
            if (processedItem?.contentSource && !seenIds.has(processedItem.contentSource.id)) {
              sources.push(processedItem.contentSource);
              seenIds.add(processedItem.contentSource.id);
            }
          }

          // Check if interaction has a contentOutputId
          if (substage.interaction?.contentOutputId && !seenIds.has(substage.interaction.contentOutputId)) {
            const contentOutputId = substage.interaction.contentOutputId;
            const processedItem = this.processedContentItems.find(item => item.id === contentOutputId);
            if (processedItem?.contentSource && !seenIds.has(processedItem.contentSource.id)) {
              sources.push(processedItem.contentSource);
              seenIds.add(processedItem.contentSource.id);
            }
          }
        });
      });
    }
    
    return sources;
  }

  viewSourceContent(source: any) {
    console.log('[LessonEditor] View source content:', source);
    this.viewingSourceContent = source;
    this.showSourceContentViewModal = true;
    // Hide header
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = 'none';
  }

  editSourceContent(source: any) {
    console.log('[LessonEditor] Edit source content:', source);
    this.selectedSourceContent = { ...source };
    this.showSourceContentModal = true;
    // Hide header
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = 'none';
  }

  closeSourceContentViewModal() {
    this.showSourceContentViewModal = false;
    this.viewingSourceContent = null;
    // Show header
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
  }

  async onSourceContentDeleted(contentSourceId: string) {
    console.log('[LessonEditor] Content source deleted:', contentSourceId);
    // Reload content sources
    await this.loadLinkedContentSources();
    await this.loadProcessedContent();
    this.closeSourceContentViewModal();
  }

  async onSourceContentReprocessed(contentSourceId: string) {
    console.log('[LessonEditor] Content source reprocessed:', contentSourceId);
    // Reload processed content
    await this.loadProcessedContent();
  }

  closeSourceContentModal() {
    this.showSourceContentModal = false;
    this.selectedSourceContent = null;
    // Show header
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
  }

  saveSourceContent() {
    if (!this.selectedSourceContent) return;
    
    // Update the source content via API
    this.http.patch(`${environment.apiUrl}/content-sources/${this.selectedSourceContent.id}`, {
      title: this.selectedSourceContent.title,
      summary: this.selectedSourceContent.summary,
      fullText: this.selectedSourceContent.fullText
    }, {
      headers: {
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId
      }
    }).subscribe({
      next: () => {
        this.showSnackbar('Source content updated', 'success');
        this.closeSourceContentModal();
        this.loadProcessedContent(); // Reload to get updated data
      },
      error: (err) => {
        console.error('[LessonEditor] Failed to update source content:', err);
        this.showSnackbar('Failed to update source content', 'error');
      }
    });
  }

  configureInteraction() {
    const substage = this.getSelectedSubStage();
    console.log('[LessonEditor] 🔧 Configure interaction called for substage:', substage);
    if (!substage?.interaction) {
      console.warn('[LessonEditor] ⚠️ No interaction found on substage');
      this.showSnackbar('No interaction to configure', 'error');
      return;
    }
    
    // Load interaction config from the CURRENT view (pending or live)
    // Always use the current substage from the editor (which reflects the current view state)
    const currentSubstage = this.getSelectedSubStage();
    this.interactionConfig = currentSubstage?.interaction?.config ? JSON.parse(JSON.stringify(currentSubstage.interaction.config)) : {};
    this.interactionConfigTab = 'configure'; // Reset to configure tab
    
    const interactionTypeId = substage.interaction.type;
    
    // Fetch the interaction type to get configSchema
    this.http.get(`${environment.apiUrl}/interaction-types/${interactionTypeId}`)
      .subscribe({
        next: (interactionType: any) => {
          console.log('[LessonEditor] Loaded interaction type:', interactionType);
          this.currentInteractionType = interactionType;
          
          // Fetch the processed output data for preview
          const contentOutputId = substage.interaction?.contentOutputId;
          if (contentOutputId) {
            this.loadProcessedOutputPreview(String(contentOutputId), interactionTypeId);
          } else {
            this.interactionPreviewData = null;
            this.isInteractionPreviewLoading = false;
          }
          
          this.showInteractionConfigModal = true;
          console.log('[LessonEditor] Opening interaction config modal:', this.interactionConfig);
        },
        error: (err) => {
          console.error('[LessonEditor] Failed to load interaction type:', err);
          this.showSnackbar('Failed to load interaction configuration', 'error');
        }
      });
  }

  /**
   * Ensure preview data is loaded when viewing preview tab with a substage that has an interaction
   */
  ensurePreviewDataLoaded() {
    if (this.activeTab !== 'preview') {
      return;
    }
    
    const substage = this.getSelectedSubStage();
    if (!substage?.interaction) {
      this.interactionPreviewData = null;
      this.isInteractionPreviewLoading = false;
      return;
    }
    
    const interactionTypeId = substage.interaction.type;
    
    // For iframe/html/pixijs interactions, we need to load the interaction type first
    if (!this.currentInteractionType || this.currentInteractionType.id !== interactionTypeId) {
      // Load interaction type to get htmlCode, cssCode, jsCode
      this.http.get(`${environment.apiUrl}/interaction-types/${interactionTypeId}`)
        .subscribe({
          next: (interactionType: any) => {
            console.log('[LessonEditor] Loaded interaction type for preview:', interactionType);
            this.currentInteractionType = interactionType;
            this.loadPreviewDataForSubstage(substage);
          },
          error: (err) => {
            console.error('[LessonEditor] Failed to load interaction type for preview:', err);
            this.interactionPreviewData = null;
            this.isInteractionPreviewLoading = false;
          }
        });
    } else {
      this.loadPreviewDataForSubstage(substage);
    }
  }

  private loadPreviewDataForSubstage(substage: SubStage) {
    if (!substage?.interaction) {
      this.interactionPreviewData = null;
      this.isInteractionPreviewLoading = false;
      return;
    }
    
    let contentOutputId: string | number | undefined = substage.interaction.contentOutputId || substage.contentOutputId;
    if (!contentOutputId) {
      const assignedId = this.tryAssignProcessedContentToSubstage(substage);
      if (assignedId) {
        contentOutputId = assignedId;
      }
    }
    if (!contentOutputId) {
      this.interactionPreviewData = null;
      this.isInteractionPreviewLoading = false;
      return;
    }
    
    // Always reload preview data to ensure we have the latest config (especially for URL normalization)
    // Don't cache - reload every time to get fresh config with normalized URLs
    console.log('[LessonEditor] Loading preview data for substage:', substage.title, 'contentOutputId:', contentOutputId);
    this.loadProcessedOutputPreview(String(contentOutputId), substage.interaction.type);
  }

  private loadProcessedOutputPreview(contentOutputId: string, interactionTypeId: string) {
    this.isInteractionPreviewLoading = true;
    
    // Check if this is an iframe/html/pixijs interaction
    const interactionCategory = this.currentInteractionType?.interactionTypeCategory || '';
    const isCodeBasedInteraction = ['iframe', 'html', 'pixijs'].includes(interactionCategory);
    
    if (isCodeBasedInteraction) {
      // For code-based interactions, we need the processed output data AND the interaction type code
      this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`)
        .subscribe({
          next: (outputData: any) => {
            console.log('[LessonEditor] Loaded processed output for code-based preview:', outputData);
            
            // Get interaction config from substage (may be more up-to-date than this.interactionConfig)
            // This should match what's currently in the field
            const substage = this.getSelectedSubStage();
            const interactionConfig = substage?.interaction?.config || this.interactionConfig || {};
            
            console.log('[LessonEditor] 🔍 Raw interactionConfig.iframeGuideWebpageUrl from substage:', interactionConfig.iframeGuideWebpageUrl);
            
            // CRITICAL: Ensure URL is normalized before storing in interactionPreviewData
            // This is the source of truth for preview
            // DO NOT add www. - only add https:// protocol
            let finalUrl = interactionConfig.iframeGuideWebpageUrl;
            if (finalUrl) {
              let url = String(finalUrl).trim();
              // Remove any existing protocol to avoid duplicates
              url = url.replace(/^https?:\/\//i, '');
              // DO NOT add www. - just add https:// prefix
              finalUrl = 'https://' + url;
              console.log('[LessonEditor] 🔗 Normalized URL in loadProcessedOutputPreview:', finalUrl, '(original:', interactionConfig.iframeGuideWebpageUrl, ')');
            }
            
            // Create normalized config with the normalized URL
            const normalizedConfig = { 
              ...interactionConfig,
              iframeGuideWebpageUrl: finalUrl || interactionConfig.iframeGuideWebpageUrl
            };
            
            // Store the processed output data and interaction type info
            this.interactionPreviewData = {
              ...normalizedConfig,
              iframeGuideWebpageUrl: finalUrl, // Use normalized URL
              contentOutputId: contentOutputId,
              interactionTypeId: interactionTypeId,
              interactionCategory: interactionCategory,
              outputData: outputData.outputData || outputData,
              // Include interaction type code for rendering
              htmlCode: this.currentInteractionType?.htmlCode || '',
              cssCode: this.currentInteractionType?.cssCode || '',
              jsCode: this.currentInteractionType?.jsCode || ''
            };
            console.log('[LessonEditor] 🔍 Stored interactionPreviewData with URL:', this.interactionPreviewData.iframeGuideWebpageUrl);
            this.isInteractionPreviewLoading = false;
          },
          error: (err) => {
            console.error('[LessonEditor] Failed to load processed output:', err);
            this.interactionPreviewData = null;
            this.isInteractionPreviewLoading = false;
          }
        });
    } else {
      // For legacy interactions (like true-false-selection), use the existing logic
      this.http.get(`${environment.apiUrl}/lesson-editor/processed-outputs/${contentOutputId}`)
        .subscribe({
          next: (outputData: any) => {
            console.log('[LessonEditor] Loaded processed output for preview:', outputData);
            
            // Handle different data formats (same as lesson-view)
            let fragments: any[] = [];
            let targetStatement = 'True or False?';
            
            if (outputData.outputData) {
              if (outputData.outputData.fragments && Array.isArray(outputData.outputData.fragments)) {
                // New format with fragments
                fragments = outputData.outputData.fragments;
                targetStatement = outputData.outputData.targetStatement || outputData.outputName || 'True or False?';
              } else if (outputData.outputData.statements && Array.isArray(outputData.outputData.statements)) {
                // Legacy format with statements - convert to fragments
                fragments = outputData.outputData.statements.map((stmt: any) => ({
                  text: stmt.text,
                  isTrueInContext: stmt.isTrue,
                  explanation: stmt.explanation || ''
                }));
                targetStatement = outputData.outputData.targetStatement || outputData.outputName || 'True or False?';
              }
            }
            
            this.interactionPreviewData = {
              ...this.interactionConfig,
              contentOutputId: contentOutputId, // Store the ID to avoid reloading
              fragments: fragments,
              targetStatement: targetStatement,
              interactionTypeId: interactionTypeId || 'true-false-selection'
            };
            this.isInteractionPreviewLoading = false;
          },
          error: (err) => {
            console.error('[LessonEditor] Failed to load processed output:', err);
            this.interactionPreviewData = null;
            this.isInteractionPreviewLoading = false;
          }
        });
    }
  }

  private tryAssignProcessedContentToSubstage(substage: SubStage): string | null {
    const expectedType = substage.interaction?.type || substage.interactionType;
    const candidates: ProcessedContentItem[] = [
      ...this.processedContentItems,
      ...this.accountProcessedContentItems
    ];

    let match = candidates.find(item => {
      const itemType = item.type || (item as any).outputType;
      return expectedType && itemType && itemType === expectedType;
    });

    if (!match && this.processedContentItems.length === 1) {
      match = this.processedContentItems[0];
    }

    if (match) {
      substage.contentOutputId = match.id;
      if (substage.interaction) {
        substage.interaction.contentOutputId = match.id;
      }
      console.log('[LessonEditor] 🔗 Auto-linked processed content for preview:', match.title || match.id);
      return String(match.id);
    }

    console.warn('[LessonEditor] ⚠️ Could not auto-link processed content for preview');
    return null;
  }

  saveInteractionConfig(config: any) {
    const substage = this.getSelectedSubStage();
    if (!substage?.interaction) return;
    
    // Update the interaction config
    substage.interaction.config = { ...config };
    this.interactionConfig = { ...config }; // Update local config too
    this.markAsChanged();
    
    // CRITICAL: Clear cached preview data so it reloads with the new config
    // This ensures the preview uses the updated (potentially normalized) URL
    this.interactionPreviewData = null;
    console.log('[LessonEditor] 🔄 Cleared cached preview data to force reload with new config');
    
    // Don't close modal - just save and show message
    this.showSnackbar('Interaction configuration saved', 'success');
    
    // Reload linked content sources in case iframe guide URLs or documents were processed
    this.loadLinkedContentSources();
    
    // After saving config, we need to save the draft and refresh pending status
    // This will update the button state correctly
    // Note: saveDraft() is async but doesn't return a promise, so we'll trigger save and refresh status
    this.saveDraft();
    
    // Refresh status after a short delay to allow save to complete
    setTimeout(() => {
      this.refreshPendingDraftStatus().then(() => {
        // After saving, we're viewing pending changes, so set showingPendingChanges to true
        if (this.hasPendingDraft && this.pendingDraftData) {
          this.showingPendingChanges = true;
        }
      });
    }, 1000);
    
    // Reload preview data if we're on preview tab
    if (this.activeTab === 'preview') {
      this.ensurePreviewDataLoaded();
    }
    
    this.cdr.detectChanges();
  }

  closeInteractionConfigModal() {
    this.showInteractionConfigModal = false;
    this.interactionConfig = null;
    this.interactionConfigTab = 'configure';
    this.interactionPreviewData = null;
    this.currentInteractionType = null;
    this.cdr.detectChanges();
  }

  updatePreviewData() {
    // Update preview data with current config
    if (this.interactionPreviewData) {
      this.interactionPreviewData = {
        ...this.interactionPreviewData,
        ...this.interactionConfig
      };
    }
  }

  onPreviewCompleted(result: any) {
    console.log('[LessonEditor] Preview interaction completed:', result);
    // Don't do anything - this is just a preview, not recording results
  }

  getFirstScriptBlock(): string | null {
    const substage = this.getSelectedSubStage();
    if (!substage?.scriptBlocks || substage.scriptBlocks.length === 0) {
      return null;
    }
    // Find the first teacher_talk block
    const firstBlock = substage.scriptBlocks.find(block => block.type === 'teacher_talk');
    return firstBlock?.content || null;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  getInteractionPreviewBlobUrl(): SafeResourceUrl {
    if (!this.interactionPreviewData) {
      return this.domSanitizer.bypassSecurityTrustResourceUrl('');
    }

    // CRITICAL: The iframe uses config.url, NOT iframeGuideWebpageUrl
    // iframeGuideWebpageUrl is for content processing only, not for iframe display
    // We need to normalize config.url if it exists (from the config field, not iframeGuideWebpageUrl)

    const htmlCode = this.interactionPreviewData.htmlCode || '';
    const cssCode = this.interactionPreviewData.cssCode || '';
    const jsCode = this.interactionPreviewData.jsCode || '';
    const outputData = this.interactionPreviewData.outputData || {};
    
    // Create config - DO NOT overwrite config.url with iframeGuideWebpageUrl
    // iframeGuideWebpageUrl is for content processing, config.url is for iframe display
    const config = { 
      ...this.interactionPreviewData
    };
    
    // Normalize config.url if it exists (this is what the iframe uses)
    // Keep iframeGuideWebpageUrl separate - it's for content processing, not iframe display
    if (config.url) {
      let url = String(config.url).trim();
      // Remove any existing protocol to avoid duplicates
      url = url.replace(/^https?:\/\//i, '');
      // Add https:// prefix
      config.url = 'https://' + url;
      console.log('[LessonEditor] 🔗 Normalized config.url for iframe:', config.url);
    }
    
    // Debug: Log what's going into the config
    console.log('[LessonEditor] 🔍 Preview config.url (for iframe display):', config.url);
    console.log('[LessonEditor] 🔍 Preview config.iframeGuideWebpageUrl (for content processing, NOT used for iframe):', config.iframeGuideWebpageUrl);

    if (!htmlCode && !jsCode) {
      return this.domSanitizer.bypassSecurityTrustResourceUrl('');
    }

    const outputDataJson = JSON.stringify(outputData);
    const configJson = JSON.stringify(config);
    
    // Debug: Log the full config JSON to see what's being injected
    console.log('[LessonEditor] 🔍 Full config JSON:', configJson);
    console.log('[LessonEditor] 🔍 Config iframeGuideWebpageUrl in JSON:', JSON.parse(configJson).iframeGuideWebpageUrl);

    const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; }
    ${cssCode || ''}
  </style>
</head>
<body>
  ${htmlCode || ''}
  <script>
    // Set interaction data FIRST
    window.interactionData = ${outputDataJson};
    console.log('[Interaction] 🎯 Data injected:', window.interactionData);

    // Set interaction config
    window.interactionConfig = ${configJson};
    console.log('[Interaction] ⚙️ Config injected:', window.interactionConfig);

    // Then run the interaction code
    ${jsCode || ''}
  </script>
</body>
</html>
    `;

    // Revoke previous blob URL to prevent memory leaks
    if (this.interactionPreviewBlobUrl) {
      const oldUrl = (this.interactionPreviewBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }

    // Create a Blob URL to bypass Angular's sanitization
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    this.interactionPreviewBlobUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(url);
    
    return this.interactionPreviewBlobUrl;
  }

  // Event Handlers for Modals
  onContentProcessed(content: any) {
    console.log('[LessonEditor] Content processed:', content);
    this.loadProcessedContent();
  }

  onContentSubmittedForApproval(submission: any) {
    console.log('[LessonEditor] Content submitted for approval:', submission);
  }

  // View Changes Modal
  viewPendingChanges() {
    if (!this.lesson?.id) {
      console.log('[LessonEditor] Cannot view changes - no lesson ID');
      this.showSnackbar('No lesson loaded', 'error');
      return;
    }

    // Get the draft ID - use currentDraftId if available, otherwise get from pending drafts
    let draftId: string | number | null = this.currentDraftId;
    
    // If we don't have a draft ID, try to get it from the pending draft endpoint
    if (!draftId) {
      // First try the single draft endpoint for this lesson
      this.http.get<any>(`${environment.apiUrl}/lesson-drafts/lesson/${this.lesson.id}`, {
        headers: {
          'x-tenant-id': environment.tenantId,
          'x-user-id': environment.defaultUserId
        }
      }).subscribe({
        next: (draft) => {
          if (draft && draft.status === 'pending' && draft.id) {
            this.loadViewChangesDiff(draft.id);
          } else {
            // If single draft endpoint doesn't work, try getting from pending drafts list
            this.http.get<any[]>(`${environment.apiUrl}/lesson-drafts/pending`, {
              headers: {
                'x-tenant-id': environment.tenantId
              }
            }).subscribe({
              next: (drafts) => {
                // Filter drafts for this lesson
                const lessonDrafts = (drafts || []).filter((d: any) => d.lessonId === this.lesson?.id);
                if (lessonDrafts.length > 0) {
                  // Get the most recent pending draft for this lesson
                  const latestDraft = lessonDrafts.sort((a: any, b: any) => 
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                  )[0];
                  if (latestDraft.id) {
                    this.loadViewChangesDiff(latestDraft.id);
                  } else {
                    this.showSnackbar('No draft ID available', 'error');
                  }
                } else {
                  this.showSnackbar('No pending changes to view', 'info');
                }
              },
              error: (err) => {
                console.error('[LessonEditor] Failed to get draft from pending list:', err);
                this.showSnackbar('Failed to load changes', 'error');
              }
            });
          }
        },
        error: (err) => {
          // If single draft endpoint fails, try pending drafts list
          this.http.get<any[]>(`${environment.apiUrl}/lesson-drafts/pending`, {
            headers: {
              'x-tenant-id': environment.tenantId
            }
          }).subscribe({
            next: (drafts) => {
              // Filter drafts for this lesson
              const lessonDrafts = (drafts || []).filter((d: any) => d.lessonId === this.lesson?.id);
              if (lessonDrafts.length > 0) {
                // Get the most recent pending draft for this lesson
                const latestDraft = lessonDrafts.sort((a: any, b: any) => 
                  new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                )[0];
                if (latestDraft.id) {
                  this.loadViewChangesDiff(latestDraft.id);
                } else {
                  this.showSnackbar('No draft ID available', 'error');
                }
              } else {
                this.showSnackbar('No pending changes to view', 'info');
              }
            },
            error: (err2) => {
              console.error('[LessonEditor] Failed to get draft ID:', err2);
              this.showSnackbar('Failed to load changes', 'error');
            }
          });
        }
      });
      return;
    }

    // If we have a draft ID, use it directly
    this.loadViewChangesDiff(draftId);
  }

  private loadViewChangesDiff(draftId: string | number) {
    this.showViewChangesModal = true;
    this.loadingViewChanges = true;
    this.viewChangeGroups = [];

    // Load diff for the draft
    this.http.get<any>(`${environment.apiUrl}/lesson-drafts/${draftId}/diff`).subscribe({
      next: (diff) => {
        this.viewChangesDiff = diff;
        this.loadingViewChanges = false;
        this.groupViewChangesByCategory(diff.changes);
        console.log('[LessonEditor] Loaded changes diff:', diff);
      },
      error: (err) => {
        console.error('[LessonEditor] Failed to load changes diff:', err);
        this.loadingViewChanges = false;
        this.showSnackbar('Failed to load changes', 'error');
      }
    });
  }

  closeViewChangesModal() {
    this.showViewChangesModal = false;
    this.viewChangesDiff = null;
    this.viewChangeGroups = [];
  }

  groupViewChangesByCategory(changes: any[]) {
    const groupsMap = new Map<string, any[]>();
    
    changes.forEach(change => {
      const category = change.category || 'other';
      if (!groupsMap.has(category)) {
        groupsMap.set(category, []);
      }
      groupsMap.get(category)!.push(change);
    });

    this.viewChangeGroups = Array.from(groupsMap.entries()).map(([category, changes]) => ({
      category,
      label: this.getChangeCategoryLabel(category),
      changes,
      expanded: true // Expand all by default
    }));
  }

  toggleViewChangeGroup(group: any) {
    group.expanded = !group.expanded;
  }

  getChangeCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'new_lesson': 'New Lesson',
      'metadata': 'Metadata',
      'structure': 'Structure',
      'script': 'Script',
      'interaction': 'Interaction',
      'interaction_config': 'Interaction Config',
      'content_submission': 'Content Submission',
      'other': 'Other'
    };
    return labels[category] || category;
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

  onItemApproved(item: any) {
    console.log('[LessonEditor] Item approved:', item);
    this.loadProcessedContent();
    
    // If a lesson draft was approved, reload the lesson to get the updated live state
    if (item.type === 'lesson-draft' && item.lessonId && this.lesson && this.lesson.id === item.lessonId) {
      console.log('[LessonEditor] Lesson draft approved, reloading lesson to update live state');
      // Reload the lesson to get the latest approved state
      this.loadLesson(item.lessonId);
      this.loadLesson(String(this.lesson.id));
    }
  }

  onItemRejected(item: any) {
    console.log('[LessonEditor] Item rejected:', item);
    this.loadProcessedContent();
  }

  onContentAdded(content: any) {
    console.log('[LessonEditor] Content added:', content);
    this.loadProcessedContent();
    this.loadLinkedContentSources(); // Reload linked content sources
  }

  onNewContentAdded(content: any) {
    console.log('[LessonEditor] New content added:', content);
    this.loadProcessedContent();
    this.loadLinkedContentSources(); // Reload linked content sources
  }

  // JSON Parsing - handles the actual lesson JSON format with scriptBlocks
  parseStagesFromJSON(stagesData: any[]): Stage[] {
    if (!Array.isArray(stagesData)) {
      console.error('[LessonEditor] stages data is not an array:', stagesData);
      return [];
    }
    
    console.log('[LessonEditor] 📊 Parsing stages, count:', stagesData.length);
    console.log('[LessonEditor] 📊 Raw stages data:', JSON.stringify(stagesData, null, 2));
    
    return stagesData.map((stageData: any, stageIdx: number) => {
      // Handle both 'subStages' (new) and 'substages' (old) formats
      const subStagesData = stageData.subStages || stageData.substages || [];
      console.log(`[LessonEditor] Stage ${stageIdx}: ${stageData.title}, subStages:`, subStagesData.length);
      
      const stage: Stage = {
        id: stageData.id || `stage-${Date.now()}-${stageIdx}`,
        title: stageData.title || 'Untitled Stage',
        type: stageData.type || 'trigger',
        subStages: Array.isArray(subStagesData) ? subStagesData.map((ssData: any, ssIdx: number) => {
          console.log(`[LessonEditor]   SubStage ${ssIdx}:`, ssData.title);
          
          // Parse script blocks - convert from DB format to editor format
          const scriptBlocks: ScriptBlock[] = [];
          
          // Track used IDs to prevent duplicates
          const usedIds = new Set<string>();
          const generateUniqueId = (prefix: string, fallbackId?: string): string => {
            let baseId = fallbackId || `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            let uniqueId = baseId;
            let counter = 0;
            while (usedIds.has(uniqueId)) {
              counter++;
              uniqueId = `${baseId}-${counter}`;
            }
            usedIds.add(uniqueId);
            return uniqueId;
          };
          
          // Add pre-interaction script blocks
          if (Array.isArray(ssData.scriptBlocks)) {
            console.log(`[LessonEditor]     Pre-interaction scripts:`, ssData.scriptBlocks.length);
            ssData.scriptBlocks.forEach((block: any, blockIdx: number) => {
              const playbackRules = block.playbackRules || {};
              // Extract display configuration from playbackRules or top level (for backward compatibility)
              const showInSnack = block.showInSnack !== undefined ? block.showInSnack : (playbackRules.showInSnack || false);
              const snackDuration = block.snackDuration !== undefined ? block.snackDuration : playbackRules.snackDuration;
              const openChatUI = block.openChatUI !== undefined ? block.openChatUI : (playbackRules.openChatUI || false);
              const minimizeChatUI = block.minimizeChatUI !== undefined ? block.minimizeChatUI : (playbackRules.minimizeChatUI || false);
              const activateFullscreen = block.activateFullscreen !== undefined ? block.activateFullscreen : (playbackRules.activateFullscreen || false);
              const autoProgressAtEnd = block.autoProgressAtEnd !== undefined ? block.autoProgressAtEnd : (playbackRules.autoProgressAtEnd !== undefined ? playbackRules.autoProgressAtEnd : true);
              
              // Ensure block ID is unique and doesn't match interaction pattern
              let blockId = block.id;
              if (!blockId || blockId.startsWith('interaction-') || usedIds.has(blockId)) {
                blockId = generateUniqueId('block', blockId);
              } else {
                usedIds.add(blockId);
              }
              
              scriptBlocks.push({
                id: blockId,
                type: 'teacher_talk',
                content: block.text || '',
                startTime: block.idealTimestamp || 0,
                endTime: (block.idealTimestamp || 0) + (block.estimatedDuration || 10),
                metadata: playbackRules,
                // Include display configuration at top level for editor
                showInSnack: showInSnack,
                snackDuration: snackDuration,
                openChatUI: openChatUI,
                minimizeChatUI: minimizeChatUI,
                activateFullscreen: activateFullscreen,
                autoProgressAtEnd: autoProgressAtEnd
              });
            });
          }
          
          // Add interaction load block if interaction exists
          if (ssData.interaction) {
            console.log(`[LessonEditor]     Interaction:`, ssData.interaction.type);
            const interactionId = generateUniqueId('interaction', `interaction-${ssData.id}`);
            const interactionConfig = ssData.interaction.config || {};
            // Extract timing and config from interaction config or loadInteractionTiming
            const loadInteractionTiming = (ssData as any).loadInteractionTiming;
            const startTime = loadInteractionTiming?.startTime ?? interactionConfig.startTime ?? (scriptBlocks.length > 0 ? scriptBlocks[scriptBlocks.length - 1].endTime : 0);
            const endTime = loadInteractionTiming?.endTime ?? interactionConfig.endTime ?? ((scriptBlocks.length > 0 ? scriptBlocks[scriptBlocks.length - 1].endTime : 0) + 60);
            const autoProgressAtEnd = loadInteractionTiming?.autoProgressAtEnd ?? interactionConfig.autoProgressAtEnd ?? true;
            // Extract chat UI and fullscreen config from interaction config
            const openChatUI = interactionConfig.openChatUI !== undefined ? interactionConfig.openChatUI : false;
            const minimizeChatUI = interactionConfig.minimizeChatUI !== undefined ? interactionConfig.minimizeChatUI : false;
            const activateFullscreen = interactionConfig.activateFullscreen !== undefined ? interactionConfig.activateFullscreen : false;
            
            scriptBlocks.push({
              id: interactionId,
              type: 'load_interaction',
              content: '',
              startTime: startTime,
              endTime: endTime,
              autoProgressAtEnd: autoProgressAtEnd,
              openChatUI: openChatUI,
              minimizeChatUI: minimizeChatUI,
              activateFullscreen: activateFullscreen,
              metadata: {
                interactionType: ssData.interaction.type,
                interactionConfig: ssData.interaction.config
              }
            });
          }
          
          // Add post-interaction script blocks
          if (Array.isArray(ssData.scriptBlocksAfterInteraction)) {
            console.log(`[LessonEditor]     Post-interaction scripts:`, ssData.scriptBlocksAfterInteraction.length);
            ssData.scriptBlocksAfterInteraction.forEach((block: any, blockIdx: number) => {
              const lastEndTime = scriptBlocks.length > 0 ? scriptBlocks[scriptBlocks.length - 1].endTime : 0;
              const playbackRules = block.playbackRules || {};
              // Extract display configuration from playbackRules or top level (for backward compatibility)
              const showInSnack = block.showInSnack !== undefined ? block.showInSnack : (playbackRules.showInSnack || false);
              const snackDuration = block.snackDuration !== undefined ? block.snackDuration : playbackRules.snackDuration;
              const openChatUI = block.openChatUI !== undefined ? block.openChatUI : (playbackRules.openChatUI || false);
              const minimizeChatUI = block.minimizeChatUI !== undefined ? block.minimizeChatUI : (playbackRules.minimizeChatUI || false);
              const activateFullscreen = block.activateFullscreen !== undefined ? block.activateFullscreen : (playbackRules.activateFullscreen || false);
              const autoProgressAtEnd = block.autoProgressAtEnd !== undefined ? block.autoProgressAtEnd : (playbackRules.autoProgressAtEnd !== undefined ? playbackRules.autoProgressAtEnd : true);
              
              // Ensure block ID is unique and doesn't match interaction pattern
              let blockId = block.id;
              if (!blockId || blockId.startsWith('interaction-') || usedIds.has(blockId)) {
                blockId = generateUniqueId('block', blockId);
              } else {
                usedIds.add(blockId);
              }
              
              scriptBlocks.push({
                id: blockId,
                type: 'teacher_talk',
                content: block.text || '',
                startTime: lastEndTime,
                endTime: lastEndTime + (block.estimatedDuration || 10),
                metadata: playbackRules,
                // Include display configuration at top level for editor
                showInSnack: showInSnack,
                snackDuration: snackDuration,
                openChatUI: openChatUI,
                minimizeChatUI: minimizeChatUI,
                activateFullscreen: activateFullscreen,
                autoProgressAtEnd: autoProgressAtEnd
              });
            });
          }
          
          console.log(`[LessonEditor]     Total script blocks parsed:`, scriptBlocks.length);
          console.log(`[LessonEditor]     Interaction data:`, ssData.interaction);
          
          const substage = {
            id: ssData.id || `substage-${Date.now()}-${ssIdx}`,
            title: ssData.title || 'Untitled Sub-stage',
            type: ssData.type || 'intro',
            duration: ssData.duration || stageData.duration || 5,
            interactionType: ssData.interaction?.type || ssData.interactionType,
            contentOutputId: ssData.contentOutputId,
            scriptBlocks: scriptBlocks,
            interaction: ssData.interaction || (ssData.interactionType ? {
              type: ssData.interactionType,
              contentOutputId: ssData.contentOutputId,
              config: {}
            } : undefined)
          };
          
          console.log(`[LessonEditor]     Created substage with interaction:`, substage.interaction);
          return substage;
        }) : [],
        expanded: true
      };
      
      console.log('[LessonEditor] ✅ Parsed stage:', stage.title, 'with', stage.subStages.length, 'substages');
      return stage;
    });
  }
}
