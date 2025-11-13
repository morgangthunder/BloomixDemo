// CACHE BUST v2.3.0 - LESSON EDITOR COMPONENT - FORCE CACHE CLEAR - ID: abc123def
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonService } from '../../core/services/lesson.service';
import { ContentSourceService } from '../../core/services/content-source.service';
import { Lesson } from '../../core/models/lesson.model';
import { ContentSource } from '../../core/models/content-source.model';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContentProcessorModalComponent } from '../../shared/components/content-processor-modal/content-processor-modal.component';
import { ApprovalQueueModalComponent } from '../../shared/components/approval-queue-modal/approval-queue-modal.component';
import { ProcessedContentService, ProcessedContentItem } from '../../core/services/processed-content.service';
import { ContentLibraryModalComponent } from '../../shared/components/content-library-modal/content-library-modal.component';
import { AddTextContentModalComponent } from '../../shared/components/add-text-content-modal/add-text-content-modal.component';
import { AddImageModalComponent } from '../../shared/components/add-image-modal/add-image-modal.component';
import { AddPdfModalComponent } from '../../shared/components/add-pdf-modal/add-pdf-modal.component';

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
}

interface ProcessedContentOutput {
  id: string;
  name: string;
  type: string; // 'qa_pairs', 'summary', 'facts', etc.
  data: any;
  workflowName: string;
}

        // VERSION CHECK: This component should show "VERSION 4.5.0" in console logs
        const LESSON_EDITOR_VERSION = '4.5.0';
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
    AddPdfModalComponent
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
          <span class="desktop-only save-status" *ngIf="lastSaved && !saving && !hasUnsavedChanges">
            <small style="color: #999;">Saved {{lastSaved | date:'short'}}</small>
          </span>
          <button (click)="submitForApproval()" 
                  class="btn-primary desktop-full mobile-icon" 
                  [disabled]="hasBeenSubmitted || saving || !canSubmit()" 
                  [class.submitted]="hasBeenSubmitted"
                  title="{{hasBeenSubmitted ? 'Already submitted' : 'Submit for Approval'}}">
            <span class="desktop-only">{{hasBeenSubmitted ? '✓ Submitted' : '✓ Submit for Approval'}}</span>
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
                  <select id="substage-type" [(ngModel)]="getSelectedSubStage()!.type">
                    <option value="">Select type...</option>
                    <option *ngFor="let type of getAvailableSubStageTypes(getSelectedStage()?.type || 'trigger')" [value]="type">
                      {{getSubStageTypeLabel(type)}}
                    </option>
                  </select>
                  <small class="hint">Based on parent stage type: {{getSelectedStage()?.type | uppercase}}</small>
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
                    <button (click)="selectContent()" class="btn-small">Select</button>
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
                    <div *ngFor="let block of getSelectedSubStage()?.scriptBlocks || []; let i = index" 
                         class="script-block" 
                         [class.teacher-talk]="block.type === 'teacher_talk'"
                         [class.load-interaction]="block.type === 'load_interaction'"
                         [class.pause]="block.type === 'pause'">
                      <div class="block-header">
                        <span class="block-type-icon">{{getBlockIcon(block.type)}}</span>
                        <select [(ngModel)]="block.type" (ngModelChange)="markAsChanged()" class="block-type-select">
                          <option value="teacher_talk">👨‍🏫 Teacher Talk</option>
                          <option value="load_interaction">🎯 Interaction</option>
                          <option value="pause">⏸ Pause for Question</option>
                        </select>
                        <button (click)="deleteScriptBlock(i)" class="btn-icon" title="Delete block">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
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
                      <div *ngIf="block.type === 'load_interaction'" class="interaction-selector">
                        <label>Interaction Type:</label>
                        <div class="interaction-display">
                          <span class="interaction-badge">{{block.metadata?.interactionType || 'None'}}</span>
                          <button (click)="changeInteractionType()" class="btn-small">Change</button>
                        </div>
                        <div *ngIf="block.metadata?.interactionConfig" class="interaction-preview">
                          <small>Fragments: {{block.metadata.interactionConfig.fragments?.length || 0}}</small>
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
                <div class="preview-controls">
                  <button class="btn-icon">▶</button>
                  <button class="btn-icon">⏸</button>
                  <button class="btn-icon">⏹</button>
                  <div class="timeline-scrubber">
                    <input type="range" min="0" [max]="(getSelectedSubStage()?.duration || 5) * 60" value="0" />
                  </div>
                </div>
                
                <div class="student-view">
                  <div class="ai-teacher-message">
                    <span class="avatar">👨‍🏫</span>
                    <p>AI Teacher message will appear here during preview...</p>
                  </div>
                  
                  <div class="interaction-preview">
                    <p class="placeholder">Interaction preview will render here</p>
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

      <!-- Interaction Configuration Modal -->
      <div class="modal-overlay-fullscreen" *ngIf="showInteractionConfigModal" (click)="closeInteractionConfigModal()">
        <div class="modal-container-fullscreen" (click)="$event.stopPropagation()">
          <div class="modal-header-sticky">
            <h2>⚙️ {{getSelectedSubStage()?.interaction?.type || 'Interaction'}} Configuration</h2>
            <button (click)="closeInteractionConfigModal()" class="close-btn">✕</button>
          </div>

          <!-- Tab Navigation -->
          <div class="modal-tabs">
            <button 
              class="modal-tab"
              [class.active]="interactionConfigTab === 'configure'"
              (click)="interactionConfigTab = 'configure'">
              ⚙️ Configure
            </button>
            <button 
              class="modal-tab"
              [class.active]="interactionConfigTab === 'preview'"
              (click)="interactionConfigTab = 'preview'">
              👁️ Preview
            </button>
          </div>

          <div class="modal-body-scrollable">
            <!-- Configure Tab -->
            <div *ngIf="interactionConfigTab === 'configure'" class="config-section">
              <!-- Dynamic config fields based on interaction type -->
              <div *ngIf="getSelectedSubStage()?.interaction?.type === 'true-false-selection'">
                <div class="form-group">
                  <label for="interaction-title">Title</label>
                  <input id="interaction-title" type="text" [(ngModel)]="interactionConfig.title" placeholder="e.g., Test Your Understanding" class="form-input" />
                </div>
                <div class="form-group">
                  <label for="interaction-instructions">Instructions</label>
                  <textarea id="interaction-instructions" [(ngModel)]="interactionConfig.instructions" rows="3" placeholder="e.g., Select all the TRUE statements" class="form-input"></textarea>
                </div>
              </div>
            </div>

            <!-- Preview Tab -->
            <div *ngIf="interactionConfigTab === 'preview'" class="preview-tab-content">
              <div class="interaction-preview-fullscreen">
                <div class="preview-content">
                  <h3>How students will see it:</h3>
                  
                  <div class="preview-card">
                    <h4 class="interaction-title">{{interactionConfig?.title || '[No title set]'}}</h4>
                    <p class="interaction-instructions">{{interactionConfig?.instructions || '[No instructions set]'}}</p>
                    
                    <div class="preview-note-box">
                      <p><strong>Note:</strong> The actual interaction will load the questions/statements from the linked processed content.</p>
                      <p>Content ID: {{getSelectedSubStage()?.interaction?.contentOutputId}}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer-sticky">
            <button (click)="closeInteractionConfigModal()" class="btn-secondary">Cancel</button>
            <button (click)="saveInteractionConfig()" class="btn-primary">Save Configuration</button>
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
        font-size: 1rem;
      }
      .header-title .subtitle {
        display: none; /* Hide subtitle on mobile for space */
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
        right: 1.5rem;
        width: 56px;
        height: 56px;
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
      z-index: 1000;
      transition: transform 0.3s ease;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .snackbar.visible {
      transform: translateX(-50%) translateY(0);
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
  lastSaved: Date | null = null;
  
  // Snackbar state
  snackbarMessage: string = '';
  snackbarVisible: boolean = false;
  snackbarType: 'success' | 'error' | 'info' = 'info';
  private snackbarTimeout: any = null;
  
  // UI State
  activeTab: EditorTab = 'details';
  sidebarCollapsed: boolean = false;
  mobileSidebarOpen: boolean = false;
  sidebarWidth: number = 320;
  isResizingSidebar: boolean = false;
  
  // Drag and drop state
  draggedStage: Stage | null = null;
  draggedSubStage: {substage: SubStage, stageId: string} | null = null;
  dragOverStageId: string | null = null;
  dragOverSubStageId: string | null = null;
  
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
  interactionConfig: any = null;
  interactionConfigTab: 'configure' | 'preview' = 'configure';
  showSourceContentModal: boolean = false;
  selectedSourceContent: any = null;
  showProcessedContentJsonModal: boolean = false;
  selectedProcessedJson: any = null;
  
  // Processed Content
  processedContentItems: ProcessedContentItem[] = [];
  selectedProcessedContent: ProcessedContentItem | null = null;
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

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private contentSourceService: ContentSourceService,
    private processedContentService: ProcessedContentService
  ) {}

  ngOnInit() {
    // VERSION CHECK: This log should always appear when new code is loaded
    console.log('🔥🔥🔥 LESSON EDITOR VERSION 4.5.0 - HIDE HEADER IN MODALS + DRAFT DEBUG 🔥🔥🔥');
    console.log('[LessonEditor] 🚀 ngOnInit - NEW CODE LOADED - VERSION 4.5.0');
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
          if (draft) {
            console.log('[LessonEditor] 📝 Found pending draft, loading draft data');
            console.log('[LessonEditor] 🔍 Draft data preview:', draft.draftData);
            this.hasDraft = true;
            this.lastSaved = draft.createdAt ? new Date(draft.createdAt) : null;
            console.log('[LessonEditor] Draft lastSaved:', this.lastSaved);
            // Return the draft data merged with lesson metadata
            return this.http.get<any>(`${environment.apiUrl}/lessons/${id}`, {
              headers: { 'x-tenant-id': environment.tenantId }
            }).pipe(
              map(lesson => {
                console.log('[LessonEditor] 🔍 Live lesson data:', lesson.data);
                const merged = {
                  ...lesson,
                  ...draft.draftData,
                  id: lesson.id // Ensure we keep the lesson ID
                };
                console.log('[LessonEditor] 🔍 Merged lesson data:', merged.data || merged.structure);
                return merged;
              })
            );
          } else {
            console.log('[LessonEditor] 📖 No draft found, loading published lesson');
            // Load the published lesson
            return this.http.get<any>(`${environment.apiUrl}/lessons/${id}`, {
              headers: { 'x-tenant-id': environment.tenantId }
            });
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (lesson: any) => {
          console.log('[LessonEditor] ✅ Lesson loaded:', lesson);
          console.log('[LessonEditor] 📊 Full lesson.data:', lesson.data);
          this.lesson = lesson;
          
          // Parse the new JSON structure: lesson.data.structure.stages or lesson.data.stages
          const stagesData = lesson.data?.structure?.stages || lesson.data?.stages;
          console.log('[LessonEditor] 📊 Raw stagesData:', stagesData);
          if (stagesData) {
            console.log('[LessonEditor] 📊 Parsing stages from lesson data');
            this.stages = this.parseStagesFromJSON(stagesData);
            console.log('[LessonEditor] ✅ Parsed stages:', this.stages);
          } else {
            console.warn('[LessonEditor] ⚠️ No stages found in lesson data');
            this.stages = [];
          }
          
          // Set default selection to lesson
          this.selectedItem = { type: 'lesson', id: lesson.id };
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
  saveDraft() {
    console.log('[LessonEditor] 🔥🔥🔥 VERSION 3.9.0 - saveDraft() called 🔥🔥🔥');
    console.log('[LessonEditor] Lesson ID:', this.lesson?.id, 'Type:', typeof this.lesson?.id);
    
    if (!this.lesson) {
      this.showSnackbar('No lesson to save', 'error');
      return;
    }

    if (!this.lesson.id || this.lesson.id === '' || this.lesson.id === 'new') {
      this.showSnackbar('Cannot save draft for a new lesson. Please create the lesson first.', 'error');
      console.error('[LessonEditor] ❌ Cannot save draft - invalid lesson ID:', this.lesson.id);
      return;
    }

    console.log('[LessonEditor] 💾 Saving draft for lesson:', this.lesson.id);
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
      structure: {
        stages: this.stages.map(stage => ({
          id: stage.id,
          title: stage.title,
          type: stage.type,
          subStages: stage.subStages.map(substage => ({
            id: substage.id,
            title: substage.title,
            type: substage.type,
            duration: substage.duration,
            scriptBlocks: substage.scriptBlocks || [],
            interaction: substage.interactionType ? {
              type: substage.interactionType,
              config: {}
            } : null
          }))
        }))
      }
    };

    const payload = {
      lessonId: String(this.lesson.id), // Ensure it's a string
      draftData: draftData,
      changeSummary: this.generateChangeSummary(),
      changesCount: this.countChanges()
    };

    console.log('[LessonEditor] 📤 Draft payload:', JSON.stringify(payload, null, 2));
    console.log('[LessonEditor] 📤 Lesson ID:', this.lesson.id, 'Type:', typeof this.lesson.id);
    console.log('[LessonEditor] 📤 API URL:', `${environment.apiUrl}/lesson-drafts`);
    console.log('[LessonEditor] 📤 Headers:', { 'x-tenant-id': environment.tenantId, 'x-user-id': environment.defaultUserId });

    this.http.post(`${environment.apiUrl}/lesson-drafts`, payload, {
      headers: {
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId
      }
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.saving = false;
          this.hasUnsavedChanges = false;
          this.hasDraft = true;
          this.lastSaved = new Date();
          console.log('[LessonEditor] ✅ Draft saved:', response);
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

  submitForApproval() {
    // Check if draft has been saved
    if (!this.hasDraft) {
      console.log('[LessonEditor] ❌ Cannot submit - no draft saved');
      this.showSnackbar('You must make changes and Save Draft first', 'error');
      return;
    }

    if (!this.lesson) {
      this.showSnackbar('No lesson to submit', 'error');
      return;
    }
    
    console.log('[LessonEditor] 📤 Submitting draft for approval...');
    
    // In the approval workflow, submitting means the draft is already created
    // and set to 'pending' status. We just need to mark it locally as submitted.
    this.hasBeenSubmitted = true;
    this.showSnackbar('Draft submitted for approval! Check the Approval Queue.', 'success');
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
    this.snackbarMessage = message;
    this.snackbarType = type;
    this.snackbarVisible = true;
    
    // Auto-hide after 3 seconds
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
    }
    this.snackbarTimeout = setTimeout(() => {
      this.snackbarVisible = false;
    }, 3000);
  }

  canSubmit(): boolean {
    return !!(this.lesson?.title && this.stages.length > 0);
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
    console.log('[LessonEditor] 📍 Selected:', item);
    
    // Debug: Show the full substage data when selected
    if (item.type === 'substage') {
      const substage = this.getSelectedSubStage();
      console.log('[LessonEditor] 📍 Selected substage data:', substage);
      console.log('[LessonEditor] 📍 Substage has interaction?', !!substage?.interaction);
      console.log('[LessonEditor] 📍 Interaction details:', substage?.interaction);
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
    const newBlock: ScriptBlock = {
      id: `block-${Date.now()}`,
      type: 'teacher_talk',
      content: '',
      startTime: substage.scriptBlocks.length * 10,
      endTime: (substage.scriptBlocks.length * 10) + 10
    };
    substage.scriptBlocks.push(newBlock);
    this.markAsChanged();
  }

  deleteScriptBlock(index: number) {
    const substage = this.getSelectedSubStage();
    if (!substage || !substage.scriptBlocks) return;
    const confirmed = confirm('Delete this script block?');
    if (!confirmed) return;
    substage.scriptBlocks.splice(index, 1);
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
    alert('Change interaction type - To be implemented');
  }

  selectContent() {
    this.showContentLibrary = true;
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

  updateTimeFromString(event: any, block: ScriptBlock, field: 'startTime' | 'endTime') {
    const input = event.target.value.trim();
    
    // Parse MM:SS format
    const timeRegex = /^(\d{1,2}):([0-5]?\d)$/;
    const match = input.match(timeRegex);
    
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const totalSeconds = (minutes * 60) + seconds;
      
      block[field] = totalSeconds;
      this.markAsChanged();
      console.log(`[LessonEditor] ⏱️ Time updated: ${input} = ${totalSeconds}s`);
    } else {
      // Invalid format - revert to current value
      console.warn(`[LessonEditor] ⚠️ Invalid time format: ${input}. Use MM:SS (e.g., 1:30)`);
      event.target.value = this.formatTime(block[field]);
      this.showSnackbar('Invalid time format. Use MM:SS (e.g., 1:30)', 'error');
    }
  }

  markAsChanged() {
    this.hasUnsavedChanges = true;
    this.hasBeenSubmitted = false; // Reset submission status when changes are made
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

  getAvailableSubStageTypes(stageType: string): string[] {
    // Return TEACH-aligned substage types based on stage type
    return this.stageSubStageMap[stageType] || [];
  }

  getSubStageTypeLabel(type: string): string {
    // Return the label from substageTypeLabels
    return this.substageTypeLabels[type] || type;
  }

  getContentOutputName(outputId: string): string {
    const output = this.processedContentItems.find(item => item.id === outputId);
    return output?.title || 'Unknown Content';
  }

  /**
   * Get source content items used in this lesson
   */
  getSourceContentForLesson(): any[] {
    // Get unique source content items from processed content
    const sources: any[] = [];
    const seenIds = new Set<string>();
    
    this.processedContentItems.forEach(item => {
      if (item.contentSource && !seenIds.has(item.contentSource.id)) {
        sources.push(item.contentSource);
        seenIds.add(item.contentSource.id);
      }
    });
    
    return sources;
  }

  viewSourceContent(source: any) {
    console.log('[LessonEditor] View source content:', source);
    this.selectedSourceContent = { ...source };
    this.showSourceContentModal = true;
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
    
    // Load interaction config (or create default if doesn't exist)
    this.interactionConfig = substage.interaction.config ? { ...substage.interaction.config } : {};
    this.interactionConfigTab = 'configure'; // Reset to configure tab
    this.showInteractionConfigModal = true;
    console.log('[LessonEditor] Opening interaction config modal:', this.interactionConfig);
    // Hide header
    document.body.style.overflow = 'hidden';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = 'none';
  }

  saveInteractionConfig() {
    const substage = this.getSelectedSubStage();
    if (!substage?.interaction) return;
    
    // Update the interaction config
    substage.interaction.config = { ...this.interactionConfig };
    this.markAsChanged();
    this.showInteractionConfigModal = false;
    this.showSnackbar('Interaction configuration saved', 'success');
    // Show header
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
  }

  closeInteractionConfigModal() {
    this.showInteractionConfigModal = false;
    this.interactionConfig = null;
    this.interactionConfigTab = 'configure';
    // Show header
    document.body.style.overflow = '';
    const header = document.querySelector('app-header');
    if (header) (header as HTMLElement).style.display = '';
  }

  onPreviewCompleted(result: any) {
    console.log('[LessonEditor] Preview interaction completed:', result);
    // Don't do anything - this is just a preview, not recording results
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  // Event Handlers for Modals
  onContentProcessed(content: any) {
    console.log('[LessonEditor] Content processed:', content);
    this.loadProcessedContent();
  }

  onContentSubmittedForApproval(submission: any) {
    console.log('[LessonEditor] Content submitted for approval:', submission);
  }

  onItemApproved(item: any) {
    console.log('[LessonEditor] Item approved:', item);
    this.loadProcessedContent();
  }

  onItemRejected(item: any) {
    console.log('[LessonEditor] Item rejected:', item);
    this.loadProcessedContent();
  }

  onContentAdded(content: any) {
    console.log('[LessonEditor] Content added:', content);
    this.loadProcessedContent();
  }

  onNewContentAdded(content: any) {
    console.log('[LessonEditor] New content added:', content);
    this.loadProcessedContent();
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
          
          // Add pre-interaction script blocks
          if (Array.isArray(ssData.scriptBlocks)) {
            console.log(`[LessonEditor]     Pre-interaction scripts:`, ssData.scriptBlocks.length);
            ssData.scriptBlocks.forEach((block: any) => {
              scriptBlocks.push({
                id: block.id || `block-${Date.now()}-${Math.random()}`,
                type: 'teacher_talk',
                content: block.text || '',
                startTime: block.idealTimestamp || 0,
                endTime: (block.idealTimestamp || 0) + (block.estimatedDuration || 10),
                metadata: block.playbackRules || {}
              });
            });
          }
          
          // Add interaction load block if interaction exists
          if (ssData.interaction) {
            console.log(`[LessonEditor]     Interaction:`, ssData.interaction.type);
            scriptBlocks.push({
              id: `interaction-${ssData.id}`,
              type: 'load_interaction',
              content: '',
              startTime: scriptBlocks.length > 0 ? scriptBlocks[scriptBlocks.length - 1].endTime : 0,
              endTime: (scriptBlocks.length > 0 ? scriptBlocks[scriptBlocks.length - 1].endTime : 0) + 60,
              metadata: {
                interactionType: ssData.interaction.type,
                interactionConfig: ssData.interaction.config
              }
            });
          }
          
          // Add post-interaction script blocks
          if (Array.isArray(ssData.scriptBlocksAfterInteraction)) {
            console.log(`[LessonEditor]     Post-interaction scripts:`, ssData.scriptBlocksAfterInteraction.length);
            ssData.scriptBlocksAfterInteraction.forEach((block: any) => {
              const lastEndTime = scriptBlocks.length > 0 ? scriptBlocks[scriptBlocks.length - 1].endTime : 0;
              scriptBlocks.push({
                id: block.id || `block-${Date.now()}-${Math.random()}`,
                type: 'teacher_talk',
                content: block.text || '',
                startTime: lastEndTime,
                endTime: lastEndTime + (block.estimatedDuration || 10),
                metadata: block.playbackRules || {}
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
