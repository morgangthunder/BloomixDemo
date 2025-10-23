import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonService } from '../../core/services/lesson.service';
import { ContentSourceService } from '../../core/services/content-source.service';
import { Lesson } from '../../core/models/lesson.model';
import { ContentSource } from '../../core/models/content-source.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

@Component({
  selector: 'app-lesson-editor-v2',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
          <button (click)="saveDraft()" class="btn-secondary desktop-full mobile-icon" [disabled]="saving" title="Save Draft">
            <span class="desktop-only" *ngIf="!saving">💾 Save Draft</span>
            <span class="desktop-only" *ngIf="saving">Saving...</span>
            <span class="mobile-only">💾</span>
          </button>
          <button (click)="submitForApproval()" class="btn-primary desktop-full mobile-icon" [disabled]="saving || !canSubmit()" title="Submit for Approval">
            <span class="desktop-only">✓ Submit for Approval</span>
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
                  <input id="title" type="text" [(ngModel)]="lesson.title" placeholder="e.g., JavaScript Fundamentals" required />
                </div>
                <div class="form-group full-width">
                  <label for="description">Description *</label>
                  <textarea id="description" [(ngModel)]="lesson.description" rows="3" placeholder="Brief overview of what students will learn" required></textarea>
                </div>
                <div class="form-group">
                  <label for="category">Category *</label>
                  <select id="category" [(ngModel)]="lesson.category" required>
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
                  <select id="difficulty" [(ngModel)]="lesson.difficulty" required>
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
                    <option value="trigger">Trigger (T) - Hook & Ignite</option>
                    <option value="explore">Explore (E) - Discover & Understand</option>
                    <option value="absorb">Absorb (A) - Learn & Internalize</option>
                    <option value="cultivate">Cultivate (C) - Practice & Apply</option>
                    <option value="hone">Hone (H) - Master & Refine</option>
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
                    <span class="value">{{getSelectedSubStage()?.interactionType || 'None'}}</span>
                    <button (click)="changeInteractionType()" class="btn-small">Change</button>
                  </div>
                </div>

                <div class="content-config">
                  <label>Processed Content</label>
                  <div class="config-value">
                    <span class="value">{{getContentOutputName(getSelectedSubStage()?.contentOutputId) || 'None'}}</span>
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
                        <select [(ngModel)]="block.type" class="block-type-select">
                          <option value="teacher_talk">👨‍🏫 Teacher Talk</option>
                          <option value="load_interaction">🎯 Load Interaction</option>
                          <option value="pause">⏸ Pause for Question</option>
                        </select>
                        <button (click)="deleteScriptBlock(i)" class="btn-icon" title="Delete block">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                      <div class="block-time">
                        <input type="number" [(ngModel)]="block.startTime" min="0" [max]="(getSelectedSubStage()?.duration || 5) * 60" placeholder="Start" />
                        <span>-</span>
                        <input type="number" [(ngModel)]="block.endTime" min="0" [max]="(getSelectedSubStage()?.duration || 5) * 60" placeholder="End" />
                        <span class="time-display">({{formatTime(block.startTime)}} - {{formatTime(block.endTime)}})</span>
                      </div>
                      <textarea *ngIf="block.type === 'teacher_talk'" 
                                [(ngModel)]="block.content" 
                                placeholder="Enter what the AI teacher should say..."
                                rows="3"></textarea>
                      <div *ngIf="block.type === 'load_interaction'" class="interaction-selector">
                        <label>Interaction:</label>
                        <select [(ngModel)]="block.metadata.interactionId">
                          <option value="">Select interaction...</option>
                          <option value="drag-drop-1">Drag & Drop</option>
                          <option value="multiple-choice-1">Multiple Choice</option>
                        </select>
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
              <h2 class="panel-title">Content Processing</h2>
              <p class="panel-description">Add source content, apply N8N workflows, and manage processed outputs for this lesson.</p>
              
              <div class="content-workflow">
                <h3>Add & Process Content</h3>
                <button (click)="searchContentLibrary()" class="btn-secondary">📚 Search Library</button>
                <button class="btn-secondary">📄 Upload File</button>
                <button class="btn-secondary">🔗 Paste URL</button>
              </div>

              <div class="processed-outputs" *ngIf="processedOutputs.length > 0">
                <h3>Processed Outputs ({{processedOutputs.length}})</h3>
                <div class="output-list">
                  <div *ngFor="let output of processedOutputs" class="output-card">
                    <div class="output-header">
                      <span class="output-name">{{output.name}}</span>
                      <span class="output-type">{{output.type}}</span>
                    </div>
                    <p class="output-workflow">{{output.workflowName}}</p>
                    <div class="output-actions">
                      <button class="btn-small">View</button>
                      <button class="btn-small">Use in Substage</button>
                      <button class="btn-small">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
              <p *ngIf="processedOutputs.length === 0" class="empty-state">
                No processed content outputs yet. Add and process source content to create outputs.
              </p>
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
            <div *ngIf="activeTab === 'ai-assistant'" class="panel ai-panel">
              <h2 class="panel-title">AI Lesson Assistant</h2>
              <p class="panel-description">Get help building your lesson, writing scripts, and refining content.</p>
              
              <div class="ai-context">
                <strong>Context:</strong> 
                <span *ngIf="selectedItem.type === 'lesson'">Entire lesson</span>
                <span *ngIf="selectedItem.type === 'stage'">Stage: {{getSelectedStage()?.title}}</span>
                <span *ngIf="selectedItem.type === 'substage'">Substage: {{getSelectedSubStage()?.title}}</span>
              </div>

              <div class="chat-container">
                <div class="chat-messages">
                  <div class="chat-message ai">
                    <span class="avatar">🤖</span>
                    <p>Hi! I'm your AI lesson assistant. How can I help you build this lesson?</p>
                  </div>
                </div>
                
                <div class="quick-actions">
                  <button class="quick-action-btn">Help write script</button>
                  <button class="quick-action-btn">Suggest interaction type</button>
                  <button class="quick-action-btn">Improve content</button>
                </div>

                <div class="chat-input">
                  <input type="text" placeholder="Ask me anything about your lesson..." [(ngModel)]="aiChatInput" />
                  <button (click)="sendAIMessage()" class="btn-primary">Send</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Mobile Sidebar Overlay -->
      <div *ngIf="mobileSidebarOpen" class="mobile-overlay" (click)="mobileSidebarOpen = false"></div>

      <!-- Mobile FAB -->
      <button class="mobile-fab" (click)="mobileSidebarOpen = !mobileSidebarOpen">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
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
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      top: 64px; /* Start below main nav on mobile */
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100; /* Below main nav */
    }
    @media (min-width: 768px) {
      :host {
        top: 80px; /* Start below main nav on desktop */
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
    }
    .panel {
      padding: 2rem;
      max-width: 1200px;
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

    /* EMPTY STATES */
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #777;
      font-style: italic;
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
        gap: 0.25rem;
        padding: 0.5rem;
        z-index: 200;
        overflow-x: auto;
      }
      .mobile-tab-btn {
        background: none;
        border: none;
        padding: 0.75rem 1rem;
        color: #999;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
        flex-shrink: 0;
        min-width: 48px;
      }
      .mobile-tab-btn.active {
        color: white;
        border-bottom-color: #cc0000;
      }
      .mobile-tab-btn .tab-icon {
        font-size: 1.25rem;
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
      margin: 0 0 1rem;
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
    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .output-name {
      font-weight: 500;
    }
    .output-type {
      background: #333;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
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
    .ai-context {
      background: #1a1a1a;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    .chat-container {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 1.5rem;
      min-height: 500px;
      display: flex;
      flex-direction: column;
    }
    .chat-messages {
      flex: 1;
      margin-bottom: 1rem;
      overflow-y: auto;
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
      margin-bottom: 1rem;
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
    .chat-input {
      display: flex;
      gap: 0.75rem;
    }
    .chat-input input {
      flex: 1;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 0.75rem;
      color: white;
      font-size: 0.875rem;
    }
    .chat-input input:focus {
      outline: none;
      border-color: #cc0000;
    }

    .full-width {
      width: 100%;
    }
    .mt-4 {
      margin-top: 1rem;
    }
  `]
})
export class LessonEditorV2Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  lesson: Lesson | null = null;
  isNewLesson: boolean = false;
  saving: boolean = false;
  
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
    'trigger': ['trigger', 'ignite', 'evoke'], // TIE
    'explore': ['handle', 'uncover', 'noodle', 'track'], // HUNT
    'absorb': ['show', 'interpret', 'parallel'], // SIP
    'cultivate': ['grip', 'repurpose', 'originate', 'work'], // GROW
    'hone': ['verify', 'evaluate', 'target'] // VET
  };
  
  substageTypeLabels: Record<string, string> = {
    // TIE (Trigger)
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
    private route: ActivatedRoute,
    private router: Router,
    private lessonService: LessonService,
    private contentSourceService: ContentSourceService
  ) {}

  ngOnInit() {
    // Get lesson ID from route
    const lessonId = this.route.snapshot.paramMap.get('id');
    
    if (lessonId === 'new') {
      this.isNewLesson = true;
      this.initializeNewLesson();
    } else if (lessonId) {
      this.loadLesson(lessonId);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeNewLesson() {
    this.lesson = {
      id: 0 as any,
      title: '',
      description: '',
      category: '',
      difficulty: undefined,
      durationMinutes: 30,
      thumbnailUrl: '',
      tags: [],
      data: { stages: [] },
      status: 'pending',
      views: 0,
      completions: 0,
      completionRate: '0',
      createdBy: ''
    };
    this.selectedItem = { type: 'lesson', id: String(this.lesson?.id || '') };
  }

  loadLesson(id: string) {
    // TODO: Load from API
    // For now, create a dummy lesson
    this.lesson = {
      id: id as any,
      title: 'JavaScript Fundamentals',
      description: 'Master JavaScript with hands-on examples',
      category: 'Programming',
      difficulty: 'Beginner',
      durationMinutes: 60,
      thumbnailUrl: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=300',
      tags: ['javascript', 'programming', 'web-development'],
      data: { stages: [] },
      status: 'approved',
      views: 1,
      completions: 0,
      completionRate: '0',
      createdBy: ''
    };
    
    this.tagsString = this.lesson?.tags?.join(', ') || '';
    this.selectedItem = { type: 'lesson', id: String(this.lesson?.id || '') };
    
    // Load stages from lesson.data
    this.loadStagesFromLesson();
  }

  loadStagesFromLesson() {
    // Parse stages from lesson.data.stages if they exist
    if (this.lesson?.data?.stages) {
      // TODO: Map from backend format to Stage[] format
    }
  }

  goBack() {
    this.router.navigate(['/lesson-builder']);
  }

  saveDraft() {
    this.saving = true;
    // TODO: Save to API
    setTimeout(() => {
      this.saving = false;
      console.log('Draft saved');
    }, 1000);
  }

  submitForApproval() {
    this.saving = true;
    // TODO: Submit to API
    setTimeout(() => {
      this.saving = false;
      console.log('Submitted for approval');
      this.router.navigate(['/lesson-builder']);
    }, 1000);
  }

  canSubmit(): boolean {
    return !!(this.lesson?.title && this.lesson?.description && this.lesson?.category && this.lesson?.difficulty);
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  selectItem(item: {type: 'lesson' | 'stage' | 'substage', id: string, stageId?: string}) {
    this.selectedItem = item;
    
    // Smart tab switching based on selection
    if (item.type === 'stage' && this.activeTab === 'details') {
      this.activeTab = 'structure';
    } else if (item.type === 'substage') {
      // Check if substage has script blocks
      const substage = this.getSelectedSubStage();
      if (substage?.scriptBlocks && substage.scriptBlocks.length > 0 && this.activeTab === 'details') {
        this.activeTab = 'script';
      } else if (this.activeTab === 'details') {
        this.activeTab = 'structure';
      }
    }
    
    // Close mobile sidebar after selection
    this.mobileSidebarOpen = false;
  }

  // Stage Management
  addStage() {
    const newStage: Stage = {
      id: `stage-${Date.now()}`,
      title: `Stage ${this.stages.length + 1}`,
      type: 'trigger',
      subStages: [],
      expanded: true
    };
    this.stages.push(newStage);
    this.selectItem({ type: 'stage', id: newStage.id });
  }

  deleteStage(stageId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this stage and all its substages?')) {
      this.stages = this.stages.filter(s => s.id !== stageId);
      if (this.selectedItem.type === 'stage' && this.selectedItem.id === stageId) {
        this.selectItem({ type: 'lesson', id: String(this.lesson?.id || '') });
      }
    }
  }

  toggleStageExpanded(stageId: string, event: Event) {
    event.stopPropagation();
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      stage.expanded = !stage.expanded;
    }
  }

  // SubStage Management
  addSubStage(stageId: string) {
    const stage = this.stages.find(s => s.id === stageId);
    if (stage) {
      // Get first available substage type for this stage
      const availableTypes = this.getAvailableSubStageTypes(stage.type);
      const defaultType = availableTypes[0] || 'default';
      
      const newSubStage: SubStage = {
        id: `substage-${Date.now()}`,
        title: `Substage ${stage.subStages.length + 1}`,
        type: defaultType,
        duration: 5,
        scriptBlocks: []
      };
      stage.subStages.push(newSubStage);
      this.selectItem({ type: 'substage', id: newSubStage.id, stageId: stageId });
    }
  }

  deleteSubStage(stageId: string, substageId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Delete this substage?')) {
      const stage = this.stages.find(s => s.id === stageId);
      if (stage) {
        stage.subStages = stage.subStages.filter(ss => ss.id !== substageId);
        if (this.selectedItem.type === 'substage' && this.selectedItem.id === substageId) {
          this.selectItem({ type: 'stage', id: stageId });
        }
      }
    }
  }

  // Getters
  getSelectedStage(): Stage | undefined {
    // If stage is selected, return it
    if (this.selectedItem.type === 'stage') {
      return this.stages.find(s => s.id === this.selectedItem.id);
    }
    // If substage is selected, return parent stage
    if (this.selectedItem.type === 'substage' && this.selectedItem.stageId) {
      return this.stages.find(s => s.id === this.selectedItem.stageId);
    }
    return undefined;
  }

  getSelectedSubStage(): SubStage | undefined {
    if (this.selectedItem.type !== 'substage' || !this.selectedItem.stageId) return undefined;
    const stage = this.stages.find(s => s.id === this.selectedItem.stageId);
    return stage?.subStages.find(ss => ss.id === this.selectedItem.id);
  }

  getTotalSubStages(): number {
    return this.stages.reduce((total, stage) => total + stage.subStages.length, 0);
  }

  calculateTotalDuration(): number {
    let total = 0;
    this.stages.forEach(stage => {
      stage.subStages.forEach(substage => {
        total += substage.duration || 0;
      });
    });
    return total;
  }

  // Icons & Descriptions
  getStageIcon(type: string): string {
    const icons: Record<string, string> = {
      trigger: '🎯',
      explore: '🔍',
      absorb: '📚',
      cultivate: '🌱',
      hone: '⚡'
    };
    return icons[type] || '📌';
  }

  getStageTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      trigger: 'Hook students\' attention and spark their curiosity about the topic',
      explore: 'Help students discover and understand the concept through exploration',
      absorb: 'Guide students to internalize knowledge through focused learning',
      cultivate: 'Provide practice opportunities to apply what they\'ve learned',
      hone: 'Enable students to master the skill through refinement and challenge'
    };
    return descriptions[type] || '';
  }

  getBlockIcon(type: string): string {
    const icons: Record<string, string> = {
      teacher_talk: '👨‍🏫',
      load_interaction: '🎯',
      pause: '⏸'
    };
    return icons[type] || '▪';
  }

  // Script Management
  addScriptBlock() {
    const substage = this.getSelectedSubStage();
    if (substage) {
      if (!substage.scriptBlocks) {
        substage.scriptBlocks = [];
      }
      const lastBlock = substage.scriptBlocks[substage.scriptBlocks.length - 1];
      const startTime = lastBlock ? lastBlock.endTime : 0;
      const endTime = Math.min(startTime + 30, (substage.duration || 5) * 60);
      
      substage.scriptBlocks.push({
        id: `block-${Date.now()}`,
        type: 'teacher_talk',
        content: '',
        startTime: startTime,
        endTime: endTime,
        metadata: {}
      });
    }
  }

  deleteScriptBlock(index: number) {
    const substage = this.getSelectedSubStage();
    if (substage && substage.scriptBlocks) {
      substage.scriptBlocks.splice(index, 1);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Content Management
  getContentOutputName(id: string | undefined): string {
    if (!id) return '';
    const output = this.processedOutputs.find(o => o.id === id);
    return output ? output.name : '';
  }

  changeInteractionType() {
    console.log('Open interaction type modal');
    // TODO: Open modal to select interaction type
  }

  selectContent() {
    console.log('Open content selection modal');
    // TODO: Open modal to select processed content
  }

  searchContentLibrary() {
    console.log('Open content library search');
    // TODO: Open content library modal
  }

  // AI Assistant
  sendAIMessage() {
    if (!this.aiChatInput.trim()) return;
    console.log('AI Message:', this.aiChatInput);
    // TODO: Send to AI API
    this.aiChatInput = '';
  }
  
  // ========== Drag and Drop ==========
  
  onStageDragStart(stage: Stage, event: DragEvent) {
    this.draggedStage = stage;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  
  onStageDragOver(stageId: string, event: DragEvent) {
    event.preventDefault();
    if (this.draggedStage && this.draggedStage.id !== stageId) {
      this.dragOverStageId = stageId;
    }
  }
  
  onStageDragLeave() {
    this.dragOverStageId = null;
  }
  
  onStageDrop(targetStage: Stage, event: DragEvent) {
    event.preventDefault();
    this.dragOverStageId = null;
    
    if (this.draggedStage && this.draggedStage.id !== targetStage.id) {
      const draggedIndex = this.stages.findIndex(s => s.id === this.draggedStage!.id);
      const targetIndex = this.stages.findIndex(s => s.id === targetStage.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [removed] = this.stages.splice(draggedIndex, 1);
        this.stages.splice(targetIndex, 0, removed);
      }
    }
    
    this.draggedStage = null;
  }
  
  onSubStageDragStart(substage: SubStage, stageId: string, event: DragEvent) {
    this.draggedSubStage = { substage, stageId };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }
  
  onSubStageDragOver(substageId: string, event: DragEvent) {
    event.preventDefault();
    if (this.draggedSubStage && this.draggedSubStage.substage.id !== substageId) {
      this.dragOverSubStageId = substageId;
    }
  }
  
  onSubStageDragLeave() {
    this.dragOverSubStageId = null;
  }
  
  onSubStageDrop(targetSubstage: SubStage, targetStageId: string, event: DragEvent) {
    event.preventDefault();
    this.dragOverSubStageId = null;
    
    if (this.draggedSubStage && this.draggedSubStage.substage.id !== targetSubstage.id) {
      const sourceStageId = this.draggedSubStage.stageId;
      const sourceStage = this.stages.find(s => s.id === sourceStageId);
      const targetStage = this.stages.find(s => s.id === targetStageId);
      
      if (sourceStage && targetStage) {
        const draggedIndex = sourceStage.subStages.findIndex(ss => ss.id === this.draggedSubStage!.substage.id);
        const targetIndex = targetStage.subStages.findIndex(ss => ss.id === targetSubstage.id);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Remove from source
          const [removed] = sourceStage.subStages.splice(draggedIndex, 1);
          
          // Add to target
          targetStage.subStages.splice(targetIndex, 0, removed);
        }
      }
    }
    
    this.draggedSubStage = null;
  }
  
  // ========== Sidebar Resize ==========
  
  onResizeMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isResizingSidebar = true;
    document.addEventListener('mousemove', this.onResizeMouseMove);
    document.addEventListener('mouseup', this.onResizeMouseUp);
  }
  
  onResizeMouseMove = (event: MouseEvent) => {
    if (this.isResizingSidebar) {
      const newWidth = event.clientX;
      if (newWidth >= 280 && newWidth <= 600) {
        this.sidebarWidth = newWidth;
      }
    }
  }
  
  onResizeMouseUp = () => {
    this.isResizingSidebar = false;
    document.removeEventListener('mousemove', this.onResizeMouseMove);
    document.removeEventListener('mouseup', this.onResizeMouseUp);
  }
  
  // ========== TEACH Substage Types ==========
  
  getAvailableSubStageTypes(stageType: string): string[] {
    return this.stageSubStageMap[stageType] || [];
  }
  
  getSubStageTypeLabel(type: string): string {
    return this.substageTypeLabels[type] || type;
  }
}

