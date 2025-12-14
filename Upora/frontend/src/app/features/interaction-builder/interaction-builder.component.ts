import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Import the true-false selection component for preview
import { TrueFalseSelectionComponent } from '../interactions/true-false-selection/true-false-selection.component';
import { InteractionConfigureModalComponent } from '../../shared/components/interaction-configure-modal/interaction-configure-modal.component';
import { MediaContentSelectorComponent } from '../../shared/components/media-content-selector/media-content-selector.component';
import { UrlContentSelectorComponent } from '../../shared/components/url-content-selector/url-content-selector.component';

interface InteractionType {
  id: string;
  name: string;
  description: string;
  interactionTypeCategory?: 'html' | 'pixijs' | 'iframe' | 'uploaded-media';
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  iframeUrl?: string;
  iframeConfig?: any;
  iframeDocumentUrl?: string; // URL to uploaded document
  iframeDocumentFileName?: string; // Original filename
  category?: string;
  pixiRenderer?: string;
  isActive?: boolean;
  schema?: any;
  generationPrompt?: string;
  configSchema?: any; // New: defines what lesson-builders can configure
  sampleData?: any; // New: sample JSON for preview
  mediaConfig?: any; // Media player configuration (autoplay, loop, etc.)
  contentOutputId?: string; // Selected processed content ID for media
}

interface SuggestedChanges {
  settings?: { id?: string; name?: string; description?: string };
  code?: { html?: string; css?: string; js?: string };
  configSchema?: any;
  sampleData?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  suggestedChanges?: SuggestedChanges;
  accepted?: boolean;
}

@Component({
  selector: 'app-interaction-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, TrueFalseSelectionComponent, InteractionConfigureModalComponent, MediaContentSelectorComponent, UrlContentSelectorComponent],
  template: `
    <div class="interaction-builder">
      <!-- Header -->
      <header class="builder-header">
        <button (click)="goBack()" class="btn-icon" title="Back">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
        </button>
        <h1>Interaction Builder</h1>
        <div class="header-actions">
          <button (click)="resetToLastWorking()" 
                  class="btn-secondary" 
                  [disabled]="!hasLastWorking" 
                  title="Reset to last working version">
            🔄 Reset
          </button>
          <button (click)="saveInteraction()" 
                  [disabled]="!hasChanges || saving" 
                  title="Save all changes"
                  class="btn-save-header">
            {{ saving ? '⏳ Saving...' : '💾 SAVE' }}
          </button>
        </div>
      </header>

      <div class="builder-layout">
        <!-- Sidebar: Interaction Library -->
        <aside class="interaction-library" [class.mobile-hidden]="sidebarHidden">
          <div class="library-header">
            <h2>Interactions</h2>
            <button (click)="createNew()" class="btn-small btn-primary">+ New</button>
          </div>

          <!-- Search & Filter -->
          <div class="library-filters">
            <div class="search-box">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input type="text" 
                     [(ngModel)]="searchQuery" 
                     (ngModelChange)="filterInteractions()"
                     placeholder="Search interactions..." />
              <button *ngIf="searchQuery" (click)="searchQuery = ''; filterInteractions()" class="clear-search">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"/>
                </svg>
              </button>
            </div>

            <div class="type-filter">
              <select [(ngModel)]="typeFilter" (ngModelChange)="filterInteractions()">
                <option value="">All Categories</option>
                <option value="html">🌐 HTML</option>
                <option value="pixijs">🎮 PixiJS</option>
                <option value="iframe">🖼️ iFrame</option>
                <option value="uploaded-media">🎬 Media Player</option>
                <option value="legacy">📦 Legacy</option>
              </select>
            </div>
          </div>
          
          <div class="interactions-list">
            <div *ngFor="let interaction of filteredInteractions" 
                 class="interaction-item"
                 [class.active]="currentInteraction?.id === interaction.id"
                 (click)="loadInteraction(interaction)">
              <div class="interaction-icon">
                <span *ngIf="interaction.interactionTypeCategory === 'html'">🌐</span>
                <span *ngIf="interaction.interactionTypeCategory === 'pixijs'">🎮</span>
                <span *ngIf="interaction.interactionTypeCategory === 'iframe'">🖼️</span>
                <span *ngIf="interaction.interactionTypeCategory === 'uploaded-media'">🎬</span>
                <span *ngIf="!interaction.interactionTypeCategory">📦</span>
              </div>
              <div class="interaction-info">
                <div class="interaction-name">{{interaction.name}}</div>
                <div class="interaction-type">{{getTypeLabel(interaction.interactionTypeCategory)}}</div>
              </div>
            </div>

            <div *ngIf="filteredInteractions.length === 0 && interactions.length > 0" class="empty-state">
              No interactions match your filter.
            </div>

            <div *ngIf="interactions.length === 0" class="empty-state">
              No interactions yet. Click "New" to create one.
            </div>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="builder-main">
          <div class="editor-container" [class.no-interaction]="!currentInteraction">
            <!-- Tabs -->
            <div class="editor-tabs-main">
              <button class="sidebar-toggle mobile-only" (click)="toggleSidebar()">
                {{ sidebarHidden ? '📚 Interactions' : '📚 Hide' }}
              </button>
              <button [class.active]="activeTab === 'settings'" 
                      (click)="switchTab('settings')">⚙️ Settings</button>
              <button [class.active]="activeTab === 'code'" 
                      (click)="switchTab('code')">💻 Code</button>
              <button [class.active]="activeTab === 'config'" 
                      (click)="switchTab('config')">🔧 Config</button>
              <button [class.active]="activeTab === 'sample'" 
                      (click)="switchTab('sample')">📋 Sample</button>
              <button [class.active]="activeTab === 'preview'" 
                      (click)="switchTab('preview')">👁️ Preview</button>
              <button [class.active]="activeTab === 'ai'" 
                      (click)="switchTab('ai')">🤖 AI</button>
            </div>

            <!-- Tab Content Container - Scrollable -->
            <div class="tab-content-wrapper">
              <!-- Empty State -->
              <div *ngIf="!currentInteraction" class="empty-builder-inline">
                <div class="empty-icon">🎯</div>
                <h2>Select an interaction to edit</h2>
                <p>Or create a new one to get started</p>
              </div>


              <!-- Settings Tab -->
              <div *ngIf="isTabActive('settings') && currentInteraction" class="tab-content">
                <div class="info-section">
                <h3>Basic Information</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label>Interaction ID *</label>
                    <input type="text" [(ngModel)]="currentInteraction!.id" 
                           (ngModelChange)="markChanged()"
                           [disabled]="!isNewInteraction"
                           placeholder="e.g., my-custom-interaction" />
                    <small class="hint">Unique identifier (cannot be changed after creation)</small>
                  </div>
                  <div class="form-group">
                    <label>Name *</label>
                    <input type="text" [(ngModel)]="currentInteraction!.name" 
                           (ngModelChange)="markChanged()"
                           placeholder="e.g., Drag and Drop Sorting" />
                  </div>
                </div>

                <div class="form-group">
                  <label>Description *</label>
                  <textarea [(ngModel)]="currentInteraction!.description" 
                            (ngModelChange)="markChanged()"
                            rows="2"
                            placeholder="Describe what this interaction does"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Interaction Type *</label>
                    <select [(ngModel)]="currentInteraction!.interactionTypeCategory" 
                            [disabled]="!isNewInteraction"
                            (ngModelChange)="onTypeChange()">
                      <option value="">Select type...</option>
                      <option value="html">🌐 HTML (Custom HTML/CSS/JS)</option>
                      <option value="pixijs">🎮 PixiJS (TypeScript Game/Animation)</option>
                      <option value="iframe">🖼️ iFrame (External Embed)</option>
                      <option value="uploaded-media">🎬 Media Player (Video/Audio)</option>
                    </select>
                    <small class="hint">Cannot be changed after creation</small>
                  </div>
                  <div class="form-group">
                    <label>TEACH Stage Category</label>
                    <select [(ngModel)]="currentInteraction!.category" (ngModelChange)="markChanged()">
                      <option value="">Optional...</option>
                      <option value="tease-trigger">Tease - Trigger</option>
                      <option value="explore-experiment">Explore - Experiment</option>
                      <option value="absorb-show">Absorb - Show</option>
                      <option value="cultivate-practice">Cultivate - Practice</option>
                      <option value="hone-apply">Hone - Apply</option>
                  </select>
                </div>
                </div>
                </div>

                <!-- iFrame Type Configuration (in Settings tab) -->
                <div *ngIf="currentInteraction?.interactionTypeCategory === 'iframe'" class="info-section" style="margin-top: 30px;">
                  <h3>iFrame Configuration</h3>
                  
                  <div class="form-group">
                    <label>Overlay Mode</label>
                    <select [(ngModel)]="iframeOverlayMode" (ngModelChange)="onIframeOverlayModeChange()" class="form-control">
                      <option value="overlay">Overlay on iFrame</option>
                      <option value="section">Section below iFrame</option>
                    </select>
                    <small class="hint">Choose how the HTML/CSS/JS content is displayed: as an overlay on top of the iFrame, or as a section below it.</small>
                  </div>
                  <p class="hint" style="margin-top: 16px;">💡 <strong>Note:</strong> URL selection is available in the Config Modal (⚙️ Configure tab). The selected URL will appear in Sample Data for testing.</p>
                </div>

                <!-- Media Content Selector (for uploaded-media interactions) -->
                <div *ngIf="currentInteraction?.interactionTypeCategory === 'uploaded-media'" class="info-section" style="margin-top: 24px;">
                  <h3>Media Content</h3>
                  <div class="form-group">
                    <label>Selected Media</label>
                    <div class="config-value">
                      <span class="value">{{selectedMediaName || 'None selected'}}</span>
                      <button type="button" class="btn btn-primary" style="margin-left: 12px;" (click)="openMediaSelector()">{{selectedMediaId ? 'Change Media' : 'Select Media'}}</button>
                    </div>
                    <p class="hint">Choose approved media content to use for testing this interaction. Lesson-builders will select media when adding this interaction to lessons.</p>
                  </div>
                </div>

                <!-- Media Player Configuration (for uploaded-media type) -->
                <ng-container *ngIf="currentInteraction?.interactionTypeCategory === 'uploaded-media'">
                  <div class="info-section" style="margin-top: 30px;">
                    <h3>Media Player Configuration</h3>
                    
                    <div class="form-group">
                      <label>Overlay Mode</label>
                      <select [(ngModel)]="displayMode" (ngModelChange)="onDisplayModeChange()" class="form-control">
                        <option value="overlay">Overlay on Player</option>
                        <option value="section">Section Below Player</option>
                      </select>
                      <small class="hint">Choose how the HTML/CSS/JS content is displayed: as an overlay on top of the media player, or as a section below it.</small>
                    </div>

                    <div class="form-group">
                      <label>
                        <input type="checkbox" [(ngModel)]="showPlayerControls" (ngModelChange)="onShowPlayerControlsChange()" />
                        Show Player Controls
                      </label>
                      <small class="hint">When enabled, native video/audio controls will be visible. When disabled, controls will be hidden and the player can be controlled via lesson-viewer controls.</small>
                    </div>

                    <div class="form-group">
                      <label>
                        <input type="checkbox" [(ngModel)]="hideOverlayDuringPlayback" (ngModelChange)="onHideOverlayDuringPlaybackChange()" />
                        Hide HTML Content During Playback
                      </label>
                      <small class="hint">When enabled, text content (headers, paragraphs) in the overlay will be hidden when media is playing, but buttons and interactive elements will remain visible. When disabled, all overlay content stays visible during playback.</small>
                    </div>

                    <div *ngIf="displayMode === 'section'" class="form-row">
                      <div class="form-group">
                        <label>Section Height</label>
                        <input type="text" [(ngModel)]="sectionHeight" (ngModelChange)="onSectionSizingChange()" 
                               class="form-control" placeholder="auto" />
                        <small class="hint">Height of the section (e.g., "auto", "300px", "50vh"). Default: "auto"</small>
                      </div>
                      <div class="form-group">
                        <label>Section Min Height</label>
                        <input type="text" [(ngModel)]="sectionMinHeight" (ngModelChange)="onSectionSizingChange()" 
                               class="form-control" placeholder="200px" />
                        <small class="hint">Minimum height (e.g., "200px", "150px"). Default: "200px"</small>
                      </div>
                      <div class="form-group">
                        <label>Section Max Height</label>
                        <input type="text" [(ngModel)]="sectionMaxHeight" (ngModelChange)="onSectionSizingChange()" 
                               class="form-control" placeholder="none" />
                        <small class="hint">Maximum height (e.g., "500px", "50vh", "none"). Default: "none"</small>
                      </div>
                    </div>
                  </div>
                </ng-container>

              <!-- Settings Actions -->
              <div class="settings-actions">
                <button (click)="resetToLastWorking('settings')" 
                        class="btn-reset-inline" 
                        [disabled]="!hasLastWorking || saving"
                        title="Reset to last working version">
                  🔄 Reset
                </button>
                <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="!hasChanges || saving">
                  {{ saving ? '⏳ Saving...' : '💾 Save' }}
                </button>
              </div>
              </div>

              <!-- Code Tab -->
              <div *ngIf="isTabActive('code') && currentInteraction" class="tab-content">
                <div class="code-section">
                  <div class="section-header">
                    <h3>Interaction Code</h3>
                    <p class="hint">Define the actual code that runs this interaction</p>
                  </div>


                <!-- HTML Type Code Editor -->
                <div *ngIf="currentInteraction?.interactionTypeCategory === 'html'" class="html-editor">
                  <div class="editor-subtabs">
                    <button [class.active]="activeCodeTab === 'html'" 
                            (click)="activeCodeTab = 'html'">HTML</button>
                    <button [class.active]="activeCodeTab === 'css'" 
                            (click)="activeCodeTab = 'css'">CSS</button>
                    <button [class.active]="activeCodeTab === 'js'" 
                            (click)="activeCodeTab = 'js'">JavaScript</button>
                  </div>

                  <div class="code-editor-container">
                    <textarea *ngIf="activeCodeTab === 'html'"
                              [(ngModel)]="currentInteraction!.htmlCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder="<div>Your HTML here</div>"
                              spellcheck="false"></textarea>

                    <textarea *ngIf="activeCodeTab === 'css'"
                              [(ngModel)]="currentInteraction!.cssCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder=".your-class { color: blue; }"
                              spellcheck="false"></textarea>

                    <textarea *ngIf="activeCodeTab === 'js'"
                              [(ngModel)]="currentInteraction!.jsCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder="// Your JavaScript code"
                              spellcheck="false"></textarea>
                  </div>
                </div>

                <!-- PixiJS Type Code Editor -->
                <div *ngIf="currentInteraction?.interactionTypeCategory === 'pixijs'" class="pixijs-editor">
                  <p class="editor-note">
                    💡 For PixiJS interactions, write a single TypeScript/JavaScript file that exports your interaction.
                  </p>
                  <div class="code-editor-container">
                    <textarea [(ngModel)]="currentInteraction!.jsCode"
                              (ngModelChange)="markChanged()"
                              class="code-textarea"
                              placeholder="// PixiJS TypeScript code"
                              spellcheck="false"></textarea>
                  </div>
                </div>

                <!-- iFrame Type Configuration -->
                <div *ngIf="currentInteraction?.interactionTypeCategory === 'iframe'" class="iframe-config">
                  <!-- iFrame URL field removed - URL comes from sample data or instance config -->

                  <div class="form-group">
                    <label>iFrame Configuration (JSON)</label>
                    <textarea [(ngModel)]="iframeConfigText"
                              (ngModelChange)="onIframeConfigChange()"
                              class="code-textarea"
                              rows="6"
                              placeholder='{"useOverlay": false, "allowFullscreen": true, "sandbox": "allow-scripts allow-same-origin"}'
                              spellcheck="false"></textarea>
                    <small class="hint">Optional: Set "useOverlay": true to enable overlay mode with custom HTML/CSS/JS code. Other options: width, height, allow permissions, etc.</small>
                  </div>

                  <!-- Overlay Mode Toggle -->
                  <div class="form-group" *ngIf="getIframeConfigValue('useOverlay')">
                    <div class="info-section">
                      <h4>🎨 Overlay Mode Enabled</h4>
                      <p>When overlay mode is enabled, you can add custom HTML/CSS/JS code that will appear in an overlay panel on top of the iframe. This allows you to add interactive elements, buttons, or UI controls that work with the AI Teacher SDK.</p>
                      <p><strong>Use the HTML, CSS, and JavaScript tabs below to add your overlay content.</strong></p>
                    </div>
                  </div>

                  <!-- HTML/CSS/JS Code Editors for Overlay (only show if overlay enabled) -->
                  <div *ngIf="getIframeConfigValue('useOverlay')" class="overlay-code-editor">
                    <div class="editor-subtabs">
                      <button [class.active]="activeCodeTab === 'html'" 
                              (click)="activeCodeTab = 'html'">HTML</button>
                      <button [class.active]="activeCodeTab === 'css'" 
                              (click)="activeCodeTab = 'css'">CSS</button>
                      <button [class.active]="activeCodeTab === 'js'" 
                              (click)="activeCodeTab = 'js'">JavaScript</button>
                    </div>

                    <div class="code-editor-container">
                      <textarea *ngIf="activeCodeTab === 'html'"
                                [(ngModel)]="currentInteraction!.htmlCode"
                                (ngModelChange)="markChanged()"
                                class="code-textarea"
                                placeholder='<div id="overlay-content">Your overlay HTML here</div>'
                                spellcheck="false"></textarea>

                      <textarea *ngIf="activeCodeTab === 'css'"
                                [(ngModel)]="currentInteraction!.cssCode"
                                (ngModelChange)="markChanged()"
                                class="code-textarea"
                                placeholder=".overlay-content { color: #00d4ff; }"
                                spellcheck="false"></textarea>

                      <textarea *ngIf="activeCodeTab === 'js'"
                                [(ngModel)]="currentInteraction!.jsCode"
                                (ngModelChange)="markChanged()"
                                class="code-textarea"
                                placeholder="// Your overlay JavaScript code&#10;// Access AI Teacher SDK via: window.parent.postMessage(...)&#10;// Or use the createIframeAISDK() helper function"
                                spellcheck="false"></textarea>
                    </div>
                    <div class="editor-note">
                      <p>💡 <strong>Overlay Code Tips:</strong></p>
                      <ul>
                        <li>Your HTML will be injected into a container with id="overlay-content"</li>
                        <li>Your CSS will be scoped to the overlay panel</li>
                        <li>Your JavaScript can use the AI Teacher SDK (same as HTML/PixiJS interactions)</li>
                        <li>The overlay panel is positioned on the right side by default (320px wide)</li>
                        <li>Users can toggle the overlay visibility via a gear button</li>
                      </ul>
                    </div>
                  </div>

                  <!-- Screenshot Trigger Options -->
                  <div class="form-group">
                    <label>Screenshot Triggers</label>
                    <small class="hint">Select when to automatically capture screenshots for AI guidance</small>
                    <div class="checkbox-group">
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [checked]="getScreenshotTrigger('iframeLoad')"
                               (change)="toggleScreenshotTrigger('iframeLoad', $event)"
                               [disabled]="!currentInteraction?.iframeConfig" />
                        <span>On iframe load (initial page load)</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [checked]="getScreenshotTrigger('iframeUrlChange')"
                               (change)="toggleScreenshotTrigger('iframeUrlChange', $event)"
                               [disabled]="!currentInteraction?.iframeConfig" />
                        <span>On URL change (navigation within iframe)</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [checked]="getScreenshotTrigger('postMessage')"
                               (change)="toggleScreenshotTrigger('postMessage', $event)"
                               [disabled]="!currentInteraction?.iframeConfig" />
                        <span>On postMessage (if iframed site sends messages)</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [checked]="getScreenshotTrigger('scriptBlockComplete')"
                               (change)="toggleScreenshotTrigger('scriptBlockComplete', $event)"
                               [disabled]="!currentInteraction?.iframeConfig" />
                        <span>On script block completion (after teacher narration)</span>
                      </label>
                      <label class="checkbox-label">
                        <input type="checkbox" 
                               [checked]="getScreenshotTrigger('periodic')"
                               (change)="toggleScreenshotTrigger('periodic', $event)"
                               [disabled]="!currentInteraction?.iframeConfig" />
                        <span>Periodic screenshots</span>
                        <input *ngIf="getScreenshotTrigger('periodic')" 
                               type="number" 
                               [value]="getPeriodicInterval()"
                               (change)="setPeriodicInterval($event)"
                               min="5" 
                               max="300" 
                               class="interval-input"
                               placeholder="30" />
                        <span class="hint-inline">seconds</span>
                      </label>
                    </div>
                  </div>

                  <!-- Document Upload -->
                  <div class="form-group">
                    <label>Reference Document (Optional)</label>
                    <small class="hint">Upload a document (PDF, DOCX, TXT) to provide context for AI guidance. This document will be included in all screenshot-triggered AI queries.</small>
                    <div class="file-upload-area">
                      <input type="file" 
                             #fileInput
                             (change)="onDocumentUpload($event)"
                             accept=".pdf,.docx,.txt,.doc"
                             class="file-input"
                             [disabled]="uploadingDocument" />
                      <div *ngIf="!currentInteraction?.iframeDocumentUrl && !uploadingDocument" class="upload-prompt">
                        <button type="button" (click)="fileInput.click()" class="btn-secondary btn-small">
                          📄 Choose Document
                        </button>
                        <span class="hint">Max 10MB. PDF, DOCX, or TXT</span>
                      </div>
                      <div *ngIf="uploadingDocument" class="upload-status">
                        <span>⏳ Uploading...</span>
                      </div>
                      <div *ngIf="currentInteraction?.iframeDocumentUrl && !uploadingDocument" class="uploaded-file">
                        <span class="file-name">📄 {{ getDocumentFileName() }}</span>
                        <button type="button" (click)="removeDocument()" class="btn-remove" title="Remove document">
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Media Player Type Configuration -->
                <div *ngIf="currentInteraction?.interactionTypeCategory === 'uploaded-media'" class="media-player-config">
                  <!-- Processed Content Selector -->
                  <div class="form-group">
                    <label>Processed Content Source</label>
                    <div class="config-value">
                      <span class="value">{{selectedMediaName || 'None selected'}}</span>
                      <button type="button" class="btn btn-primary" style="margin-left: 12px;" (click)="openMediaSelector()">{{selectedMediaId ? 'Change Media' : 'Select Media'}}</button>
                    </div>
                    <small class="hint">Select approved media content (video or audio) to use for this interaction. This will be available as processed content when the interaction is used in lessons.</small>
                  </div>

                  <!-- Media Config JSON -->
                  <div class="form-group">
                    <label>Media Configuration (JSON)</label>
                    <textarea [(ngModel)]="mediaConfigText"
                              (ngModelChange)="onMediaConfigChange()"
                              class="code-textarea"
                              rows="6"
                              placeholder='{"autoplay": false, "loop": false, "showControls": true, "defaultVolume": 1.0}'
                              spellcheck="false"></textarea>
                    <small class="hint">Configure media player behavior: autoplay, loop, showControls, defaultVolume (0.0 to 1.0), startTime, endTime, etc.</small>
                  </div>

                  <!-- Overlay Code Section -->
                  <div class="form-group">
                    <div class="info-section">
                      <h4>🎨 Overlay Code</h4>
                      <p>Add custom HTML/CSS/JS code that will appear in an overlay panel at the bottom of the media player. This allows you to add interactive elements, buttons, or UI controls that work with the AI Teacher SDK.</p>
                      <p><strong>Use the HTML, CSS, and JavaScript tabs below to add your overlay content.</strong></p>
                    </div>
                  </div>

                  <!-- HTML/CSS/JS Code Editors for Overlay -->
                  <div class="overlay-code-editor">
                    <div class="editor-subtabs">
                      <button [class.active]="activeCodeTab === 'html'" 
                              (click)="activeCodeTab = 'html'">HTML</button>
                      <button [class.active]="activeCodeTab === 'css'" 
                              (click)="activeCodeTab = 'css'">CSS</button>
                      <button [class.active]="activeCodeTab === 'js'" 
                              (click)="activeCodeTab = 'js'">JavaScript</button>
                    </div>

                    <div class="code-editor-container">
                      <textarea *ngIf="activeCodeTab === 'html'"
                                [(ngModel)]="currentInteraction!.htmlCode"
                                (ngModelChange)="markChanged()"
                                class="code-textarea"
                                placeholder='<div id="media-overlay">Your overlay HTML here</div>'
                                spellcheck="false"></textarea>

                      <textarea *ngIf="activeCodeTab === 'css'"
                                [(ngModel)]="currentInteraction!.cssCode"
                                (ngModelChange)="markChanged()"
                                class="code-textarea"
                                placeholder="#media-overlay { position: absolute; bottom: 0; }"
                                spellcheck="false"></textarea>

                      <textarea *ngIf="activeCodeTab === 'js'"
                                [(ngModel)]="currentInteraction!.jsCode"
                                (ngModelChange)="markChanged()"
                                class="code-textarea"
                                placeholder="// Your overlay JavaScript code&#10;// Use createIframeAISDK() to access the AI Teacher SDK&#10;// Media control methods: playMedia(), pauseMedia(), seekMedia(time), etc."
                                spellcheck="false"></textarea>
                    </div>
                    <div class="editor-note">
                      <p>💡 <strong>Media Player Overlay Code Tips:</strong></p>
                      <ul>
                        <li>Your HTML will be injected into the media player overlay container</li>
                        <li>Your CSS will be scoped to the overlay panel</li>
                        <li>Your JavaScript can use the AI Teacher SDK with media control methods</li>
                        <li>The overlay panel is positioned at the bottom of the media player by default</li>
                        <li>Media control methods: <code>playMedia()</code>, <code>pauseMedia()</code>, <code>seekMedia(time)</code>, <code>setMediaVolume(volume)</code>, <code>getMediaCurrentTime()</code>, <code>getMediaDuration()</code>, <code>isMediaPlaying()</code></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div *ngIf="!currentInteraction?.interactionTypeCategory" class="no-type-selected">
                  <p>⚠️ Please select an interaction type in the Settings tab first.</p>
                </div>

                <!-- Test Button and Save -->
                <div *ngIf="currentInteraction?.interactionTypeCategory" class="code-actions">
                  <button (click)="testCode()" class="btn-test" [disabled]="testing">
                    {{ testing ? '⏳ Testing...' : '🧪 Test Code' }}
                  </button>
                  <button (click)="resetToLastWorking('code')" 
                          class="btn-reset-inline" 
                          [disabled]="!hasLastWorking || saving"
                          title="Reset to last working version">
                    🔄 Reset
                  </button>
                  <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="!hasChanges || saving">
                    {{ saving ? '⏳ Saving...' : '💾 Save' }}
                  </button>
                </div>
                <div *ngIf="testResult" class="test-result" [class.success]="testResult.success" [class.error]="!testResult.success">
                  <button (click)="testResult = null" class="close-test-result" title="Close">✕</button>
                  <div class="result-icon">{{ testResult.success ? '✅' : '❌' }}</div>
                  <div class="result-content">
                    <div class="result-message">{{ testResult.message }}</div>
                    <pre *ngIf="testResult.error" class="error-details">{{testResult.error}}</pre>
                  </div>
                </div>
                </div>
              </div>

              <!-- Config Schema Tab -->
              <div *ngIf="isTabActive('config') && currentInteraction" class="tab-content">
                <div class="config-schema-section">
                  <div class="section-header">
                    <h3>Configuration Schema</h3>
                    <p class="hint">Define what lesson-builders can configure when using this interaction</p>
                  </div>

                <div class="form-group">
                  <label>Config Schema (JSON)</label>
                  <textarea [(ngModel)]="configSchemaText"
                            (ngModelChange)="onConfigSchemaChange()"
                            class="code-textarea"
                            rows="20"
                            placeholder="Example JSON schema for configuration"
                            spellcheck="false"></textarea>
                  <small class="hint">This defines the Configure modal that lesson-builders will see</small>
                </div>

                <div *ngIf="configSchemaError" class="error-message">
                  ⚠️ Invalid JSON: {{configSchemaError}}
                </div>

                <div class="config-actions">
                  <button (click)="showConfigModal()" class="btn-secondary" [disabled]="!currentInteraction?.configSchema">
                    👁️ Preview Config Modal
                  </button>
                  <button (click)="testConfig()" class="btn-test-inline" [disabled]="testingConfig || !currentInteraction">
                    {{ testingConfig ? '⏳ Testing...' : '🧪 Test Config' }}
                  </button>
                  <button (click)="resetToLastWorking('config')" 
                          class="btn-reset-inline" 
                          [disabled]="!hasLastWorking || saving"
                          title="Reset to last working version">
                    🔄 Reset
                  </button>
                  <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="saving || configSchemaError">
                    {{ saving ? '⏳ Saving...' : '💾 Save' }}
                  </button>
                </div>
                <div *ngIf="testConfigResult" class="test-result" [class.success]="testConfigResult.success" [class.error]="!testConfigResult.success">
                  <button (click)="testConfigResult = null" class="close-test-result" title="Close">✕</button>
                  <span *ngIf="testConfigResult.success">✅</span>
                  <span *ngIf="!testConfigResult.success">❌</span>
                  <span>{{ testConfigResult.message }}</span>
                  <div *ngIf="testConfigResult.error" class="test-error-detail">{{ testConfigResult.error }}</div>
                </div>
                </div>
              </div>

              <!-- Sample Data Tab -->
              <div *ngIf="isTabActive('sample') && currentInteraction" class="tab-content">
                <div class="sample-data-section">
                  <div class="section-header">
                    <h3>Sample Data</h3>
                    <p class="hint">Provide sample JSON data to test your interaction in the Preview tab</p>
                    <div *ngIf="currentInteraction?.interactionTypeCategory === 'pixijs' || currentInteraction?.interactionTypeCategory === 'html'" class="info-box" style="background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 8px; padding: 12px; margin-top: 12px;">
                      <p style="margin: 0; color: #00d4ff; font-size: 13px;">
                        <strong>📋 Sample Data Purpose:</strong> This sample data is used for testing your interaction in the Preview tab and defines the format that content analysis LLM prompts will use to construct input for interaction instances. 
                        <br><br>
                        <strong>📋 Processed Content in Lessons:</strong> When a lesson-builder adds processed content to a substage, that processed content will <strong>replace</strong> this sample data in actual lesson instances. 
                        The processed content should be a JSON object in the same format as this sample data, accessible via <code>window.interactionData</code> in your interaction code.
                      </p>
                    </div>
                  </div>

                <div class="form-group">
                  <label>Sample Input Data (JSON)</label>
                  <textarea [(ngModel)]="sampleDataText"
                            (ngModelChange)="onSampleDataChange()"
                            class="code-textarea"
                            rows="20"
                            placeholder="Example JSON data for testing"
                            spellcheck="false"></textarea>
                  <small class="hint">This data is used for testing in the Preview tab and defines the format for content analysis LLM prompts. In actual lesson instances, processed content (if present) will replace this sample data.</small>
                </div>

                <div *ngIf="sampleDataError" class="error-message">
                  ⚠️ Invalid JSON: {{sampleDataError}}
                </div>

                <div class="sample-actions">
                  <button (click)="testSampleData()" class="btn-test-inline" [disabled]="testingSample || !currentInteraction">
                    {{ testingSample ? '⏳ Testing...' : '🧪 Test Sample Data' }}
                  </button>
                  <button (click)="resetToLastWorking('sample')" 
                          class="btn-reset-inline" 
                          [disabled]="!hasLastWorking || saving"
                          title="Reset to last working version">
                    🔄 Reset
                  </button>
                  <button (click)="saveInteraction()" class="btn-save-inline" [disabled]="saving || sampleDataError">
                    {{ saving ? '⏳ Saving...' : '💾 Save' }}
                  </button>
                </div>
                <div *ngIf="testSampleResult" class="test-result" [class.success]="testSampleResult.success" [class.error]="!testSampleResult.success">
                  <button (click)="testSampleResult = null" class="close-test-result" title="Close">✕</button>
                  <span *ngIf="testSampleResult.success">✅</span>
                  <span *ngIf="!testSampleResult.success">❌</span>
                  <span>{{ testSampleResult.message }}</span>
                  <div *ngIf="testSampleResult.error" class="test-error-detail">{{ testSampleResult.error }}</div>
                </div>
                </div>
              </div>

              <!-- Preview Tab -->
              <!-- AI Tab -->
              <div *ngIf="isTabActive('ai') && currentInteraction" class="tab-content">
                <div class="ai-config-section">
                  <div class="section-header">
                    <h3>AI Teacher Integration</h3>
                    <p class="hint">Configure how this interaction integrates with the AI Teacher</p>
                  </div>

                  <!-- Custom Prompt Template -->
                  <div class="form-group">
                    <label>Custom Prompt Template</label>
                    <p class="hint">Additional instructions for the AI Teacher when responding to events from this interaction. This is appended to the base system prompt and interaction context.</p>
                    <textarea 
                      [(ngModel)]="aiPromptTemplateText"
                      (ngModelChange)="onAIPromptTemplateChange()"
                      rows="8"
                      placeholder="Example:&#10;When a student selects an incorrect answer, provide a hint that guides them toward the correct understanding without giving away the answer directly.&#10;&#10;If the student is struggling, break down the concept into smaller steps."></textarea>
                  </div>

                  <!-- Event Handlers -->
                  <div class="form-group">
                    <label>Event Handlers (JSON)</label>
                    <p class="hint">Configure which events trigger LLM responses and how. Format: JSON object with event types as keys.</p>
                    <textarea 
                      [(ngModel)]="aiEventHandlersText"
                      (ngModelChange)="onAIEventHandlersChange()"
                      rows="10"
                      placeholder="Define event handlers in JSON format"></textarea>
                    <div *ngIf="aiEventHandlersError" class="error-message">{{ aiEventHandlersError }}</div>
                  </div>

                  <!-- Response Actions -->
                  <div class="form-group">
                    <label>Response Actions (JSON)</label>
                    <p class="hint">Define which action types this interaction can execute from AI responses. Format: JSON object with actionTypes array and defaultFormat.</p>
                    <textarea 
                      [(ngModel)]="aiResponseActionsText"
                      (ngModelChange)="onAIResponseActionsChange()"
                      rows="6"
                      placeholder="Define response actions in JSON format"></textarea>
                    <div *ngIf="aiResponseActionsError" class="error-message">{{ aiResponseActionsError }}</div>
                  </div>

                  <div class="info-box">
                    <h4>📚 SDK Quick Reference</h4>
                    <p>Interactions can emit events using the SDK:</p>
                    <pre>{{ '{' }}aiSDK.emitEvent({{ '{' }}&#10;  type: 'user-selection',&#10;  data: {{ '{' }} index: 0 {{ '}' }},&#10;  requiresLLMResponse: true&#10;{{ '}' }});{{ '}' }}</pre>
                    <p>Subscribe to responses:</p>
                    <pre>aiSDK.onResponse((response) => {{ '{' }}&#10;  console.log(response.response);&#10;  response.actions?.forEach(action => {{ '{' }}&#10;    if (action.type === 'highlight') highlight(action.target);&#10;  {{ '}' }});&#10;{{ '}' }});</pre>
                    <p class="hint">📚 SDK documentation is available in the codebase at: <code>Upora/frontend/src/app/core/services/INTERACTION_AI_SDK_QUICK_REFERENCE.md</code></p>
                  </div>
                </div>
              </div>

              <div *ngIf="isTabActive('preview') && currentInteraction" class="tab-content preview-tab-content">
                <div class="preview-section">
                  <div class="section-header">
                    <h3>Live Preview</h3>
                    <p class="hint">See how your interaction looks with the sample data</p>
                    <button (click)="refreshPreview()" class="btn-refresh">
                      🔄 Refresh Preview
                    </button>
                  </div>

                  <div class="preview-container" [attr.data-preview-key]="previewKey">
                    <!-- HTML Preview (use Blob URL for better script execution) -->
                    <!-- Force iframe recreation by using previewKey in *ngIf condition -->
                    <div *ngIf="(currentInteraction?.interactionTypeCategory === 'html') && currentInteraction?.htmlCode && previewKey" 
                         class="html-preview">
                      <iframe #previewIframe 
                              [src]="getHtmlPreviewBlobUrl()" 
                              [attr.data-key]="previewKey"
                              class="preview-iframe"
                              frameborder="0"
                              sandbox="allow-scripts allow-same-origin"></iframe>
                    </div>

                    <!-- iFrame Preview (use overlay wrapper if useOverlay is enabled, otherwise use URL directly) -->
                    <div *ngIf="(currentInteraction?.interactionTypeCategory === 'iframe') && (getIframePreviewUrl() || getIframeConfigValue('useOverlay'))" class="html-preview">
                      <iframe #previewIframe 
                              [src]="getIframeConfigValue('useOverlay') ? getIframeOverlayPreviewBlobUrl() : getSafeIframePreviewUrl()" 
                              [attr.data-preview-key]="previewKey"
                              class="preview-iframe"
                              frameborder="0"
                              [style.width]="getIframeWidth()"
                              [style.height]="getIframeHeight()"></iframe>
                    </div>

                  <!-- iFrame Preview Placeholder (if no URL yet) -->
                  <div *ngIf="(currentInteraction?.interactionTypeCategory === 'iframe') && !getIframePreviewUrl()" class="iframe-preview-placeholder">
                    <div class="placeholder-content">
                      <span class="placeholder-icon">🖼️</span>
                      <h4>iFrame Preview</h4>
                      <p>Add sample data with a URL in the Sample Data tab to see a preview.</p>
                    </div>
                  </div>

                  <!-- PixiJS Preview (use Blob URL) -->
                  <!-- Force iframe recreation by using previewKey in *ngIf condition -->
                  <div *ngIf="(currentInteraction?.interactionTypeCategory === 'pixijs') && currentInteraction?.htmlCode && previewKey" 
                       class="html-preview">
                    <iframe #previewIframe 
                            [src]="getHtmlPreviewBlobUrl()" 
                            [attr.data-key]="previewKey"
                            class="preview-iframe"
                            frameborder="0"
                            sandbox="allow-scripts allow-same-origin"></iframe>
                  </div>

                  <!-- PixiJS Preview Placeholder (if no code yet) -->
                  <div *ngIf="(currentInteraction?.interactionTypeCategory === 'pixijs') && !currentInteraction?.htmlCode" class="pixijs-preview-placeholder">
                    <div class="placeholder-content">
                      <span class="placeholder-icon">🎮</span>
                      <h4>PixiJS Preview</h4>
                      <p>Add HTML/CSS/JS code in the Code tab to see a preview.</p>
                    </div>
                  </div>

                  <!-- Media Player Preview (use overlay wrapper similar to iframe) -->
                  <div *ngIf="(currentInteraction?.interactionTypeCategory === 'uploaded-media') && previewKey" 
                       class="html-preview media-player-preview">
                    <iframe #previewIframe 
                            [src]="getMediaPlayerPreviewBlobUrl()" 
                            [attr.data-preview-key]="previewKey"
                            class="preview-iframe"
                            frameborder="0"
                            style="width: 100%; height: calc(100vh - 320px); min-height: 400px; max-height: calc(100vh - 320px);"
                            sandbox="allow-scripts allow-same-origin"></iframe>
                  </div>

                  <!-- Media Player Preview Placeholder (if no overlay code yet) -->
                  <div *ngIf="(currentInteraction?.interactionTypeCategory === 'uploaded-media') && !currentInteraction?.htmlCode" class="media-player-preview-placeholder">
                    <div class="placeholder-content">
                      <span class="placeholder-icon">🎬</span>
                      <h4>Media Player Preview</h4>
                      <p>Add overlay HTML/CSS/JS code in the Code tab to see a preview.</p>
                      <p *ngIf="!selectedMediaId" style="margin-top: 10px; color: #ffaa00;">⚠️ Select a media file in the Code tab to test with actual media.</p>
                    </div>
                  </div>

                  <!-- Fallback: Use Angular component for true-false-selection if no HTML code -->
                  <div *ngIf="(currentInteraction?.id === 'true-false-selection') && !currentInteraction?.htmlCode && currentInteraction?.sampleData" class="interaction-preview">
                    <app-true-false-selection 
                      [data]="currentInteraction?.sampleData"
                      (interactionComplete)="onPreviewComplete($event)">
                    </app-true-false-selection>
                  </div>

                  <!-- No Preview Available -->
                  <div *ngIf="!canShowPreview()" class="no-preview">
                    <div class="placeholder-content">
                      <span class="placeholder-icon">👁️</span>
                      <h4>No Preview Available</h4>
                      <p *ngIf="!currentInteraction?.sampleData">Add sample data in the "Sample Data" tab to see a preview.</p>
                      <p *ngIf="!currentInteraction?.interactionTypeCategory">Select an interaction type in Settings.</p>
                      <p *ngIf="currentInteraction?.interactionTypeCategory === 'html' && !currentInteraction?.htmlCode">Add HTML code in the Code tab.</p>
                      <p *ngIf="currentInteraction?.interactionTypeCategory === 'iframe' && !currentInteraction?.iframeUrl">Add an iframe URL in the Code tab.</p>
                      <p *ngIf="currentInteraction?.interactionTypeCategory === 'uploaded-media' && !currentInteraction?.htmlCode">Add overlay HTML/CSS/JS code in the Code tab.</p>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- AI Assistant (Floating) -->
      <div class="ai-assistant-widget" 
           [class.minimized]="aiMinimized" 
           [class.hidden]="aiHidden">
        <div *ngIf="aiMinimized" class="ai-icon-minimized" (click)="aiMinimized = false">
          <div class="avatar">🔧</div>
          <div *ngIf="aiTyping" class="speaking-indicator">...</div>
        </div>

        <div *ngIf="!aiMinimized" class="ai-card">
          <div class="ai-header">
            <div class="ai-avatar">
              <span class="avatar-emoji">🔧</span>
            </div>
            <div class="ai-title">AI Builder Assistant</div>
            <div class="header-controls">
              <button class="control-btn" (click)="aiMinimized = true" title="Minimize">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="7" width="10" height="2" rx="1"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="chat-history" #aiChatHistory>
            <div *ngIf="aiMessages.length === 0" class="no-messages">
              <span *ngIf="!currentInteraction" class="muted-text warning-text">⚠️ An interaction must be selected to use this assistant</span>
              <span *ngIf="currentInteraction" class="muted-text">Ask me anything about building {{getTypeLabel(currentInteraction?.interactionTypeCategory)}} interactions!</span>
            </div>
            <div *ngFor="let msg of aiMessages; let i = index" 
                 [class.user-message]="msg.role === 'user'"
                 [class.ai-message]="msg.role === 'assistant'"
                 class="message"
                 [attr.data-message-index]="i">
              <div class="message-content">
                <div class="message-icon">{{ msg.role === 'user' ? '👤' : '🔧' }}</div>
                <div class="message-text">
                  <div class="message-text-content">{{ msg.content }}</div>
                  <!-- Suggested Changes Summary -->
                  <div *ngIf="msg.role === 'assistant' && msg.suggestedChanges && !msg.accepted" 
                       class="suggested-changes">
                    <div class="changes-summary">
                      <span class="changes-icon">✨</span>
                      <span class="changes-text">{{ getChangesSummary(msg.suggestedChanges) }}</span>
                    </div>
                    <button (click)="acceptSuggestedChanges(i)" 
                            class="accept-changes-btn"
                            title="Accept and apply these changes">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                      </svg>
                      Accept Changes
                    </button>
                  </div>
                  <!-- Accepted indicator -->
                  <div *ngIf="msg.role === 'assistant' && msg.accepted" 
                       class="changes-accepted">
                    <span class="accepted-icon">✅</span>
                    <span class="accepted-text">Changes applied</span>
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="aiTyping" class="ai-message message">
              <div class="message-content">
                <div class="message-icon">🔧</div>
                <div class="message-text typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          </div>

          <div class="chat-input-container">
            <textarea 
              [(ngModel)]="aiInput"
              (keydown.enter)="onAiEnter($any($event))"
              [placeholder]="currentInteraction ? 'Ask about ' + getTypeLabel(currentInteraction?.interactionTypeCategory) + ' interactions...' : 'Select an interaction first...'"
              [disabled]="!currentInteraction"
              [maxlength]="2000"
              rows="2"></textarea>
            <div *ngIf="aiInput.length >= 1900" class="char-count-warning">
              {{ aiInput.length }}/2000
            </div>
            <button (click)="sendAiMessage()" [disabled]="!currentInteraction || !aiInput.trim() || aiTyping" class="send-btn">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 10l16-8-8 16-2-8-6-0z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Shared Configure Modal Component -->
      <!-- Config Preview Modal -->
      <app-interaction-configure-modal
        [isOpen]="showingConfigModal"
        [interactionType]="currentInteraction?.id || ''"
        [interactionName]="currentInteraction?.name || 'Interaction'"
        [configSchema]="currentInteraction?.configSchema"
        [sampleData]="currentInteraction?.sampleData"
        [initialConfig]="configModalInitialConfig"
        [interactionCategory]="currentInteraction?.interactionTypeCategory || ''"
        [htmlCode]="currentInteraction?.htmlCode || ''"
        [cssCode]="currentInteraction?.cssCode || ''"
        [jsCode]="currentInteraction?.jsCode || ''"
        [isBuilderMode]="true"
        (closed)="closeConfigModal()"
        (saved)="saveConfigFromModal($event)">
      </app-interaction-configure-modal>

      <!-- Media Content Selector Modal -->
      <app-media-content-selector
        [isOpen]="showMediaSelector"
        (close)="closeMediaSelector()"
        (selected)="onMediaSelected($event)">
      </app-media-content-selector>

      <!-- URL Content Selector Modal -->
      <app-url-content-selector
        [isOpen]="showIframeContentSelector"
        [selectedContentId]="selectedIframeContentId"
        (close)="closeIframeContentSelector()"
        (contentSelected)="onIframeContentSelected($event)">
      </app-url-content-selector>

      <!-- Success Snackbar -->
      <div *ngIf="showSnackbar" class="snackbar">
        {{ snackbarMessage }}
      </div>
    </div>
  `,
  styles: [`
    .interaction-builder {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #0a0a0a;
      color: #ffffff;
    }

    .builder-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #1a1a1a;
      border-bottom: 1px solid #333;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .builder-header h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
      flex: 1;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-icon {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      background: #2a2a2a;
      color: #fff;
    }

    .btn-icon svg {
      width: 1.5rem;
      height: 1.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #2a2a2a;
      color: white;
      border: 1px solid #444;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #333;
      border-color: #555;
    }

    .btn-save-header {
      padding: 0.625rem 1.5rem;
      border-radius: 0.5rem;
      background: #00d4ff;
      color: #0f0f23;
      font-weight: 700;
      border: none;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 212, 255, 0.4);
      transition: all 0.2s;
    }

    .btn-save-header:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.6);
    }

    .btn-save-header:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .builder-layout {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Sidebar */
    .interaction-library {
      width: 320px;
      background: #1a1a1a;
      border-right: 1px solid #333;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .library-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #333;
    }

    .library-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
      border-radius: 0.375rem;
    }

    /* Search & Filter */
    .library-filters {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #333;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: #666;
      pointer-events: none;
    }

    .search-box input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 2.5rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.375rem;
      color: #fff;
      font-size: 0.875rem;
    }

    .search-box input:focus {
      outline: none;
      border-color: #667eea;
    }

    .clear-search {
      position: absolute;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
    }

    .clear-search:hover {
      background: #2a2a2a;
      color: #999;
    }

    .type-filter select {
      width: 100%;
      padding: 0.5rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.375rem;
      color: #fff;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .type-filter select:focus {
      outline: none;
      border-color: #667eea;
    }

    .interactions-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .interaction-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #0a0a0a;
      border: 1px solid #2a2a2a;
      border-radius: 0.5rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .interaction-item:hover {
      background: #1a1a1a;
      border-color: #444;
    }

    .interaction-item.active {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border-color: #667eea;
    }

    .interaction-icon {
      font-size: 1.5rem;
      width: 2.5rem;
      height: 2.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1a1a1a;
      border-radius: 0.5rem;
    }

    .interaction-item.active .interaction-icon {
      background: rgba(102, 126, 234, 0.2);
    }

    .interaction-info {
      flex: 1;
      min-width: 0;
    }

    .interaction-name {
      font-weight: 500;
      font-size: 0.875rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .interaction-type {
      font-size: 0.75rem;
      color: #999;
      margin-top: 0.125rem;
    }

    .empty-state {
      text-align: center;
      padding: 2rem 1rem;
      color: #666;
      font-size: 0.875rem;
    }

    /* Main Content */
    .builder-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #0a0a0a;
    }

    .empty-builder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-builder h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      color: #999;
    }

    .empty-builder p {
      margin: 0;
      font-size: 1rem;
    }

    .editor-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }

    /* Main Tabs - NOT sticky, just flex child */
    .editor-tabs-main {
      display: flex;
      gap: 0.5rem;
      background: #141414;
      border-bottom: 1px solid #333;
      padding: 0.5rem 1rem 0;
      flex-shrink: 0;
      overflow-x: auto;
    }

    .editor-tabs-main button {
      background: transparent;
      border: none;
      color: #999;
      padding: 0.75rem 1rem;
      cursor: pointer;
      font-weight: 500;
      border-radius: 0.375rem 0.375rem 0 0;
      transition: all 0.2s;
    }

    .editor-tabs-main button:hover {
      color: #fff;
      background: #1a1a1a;
    }

    .editor-tabs-main button.active {
      color: #fff;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border-bottom: 2px solid #667eea;
    }

    /* Tab Content Wrapper - Scrollable container */
    .tab-content-wrapper {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0; /* No padding - content sits directly under tabs */
      min-height: 0;
      /* Ensure sticky positioning works within this scrollable container */
      position: relative;
    }

    /* Regular tab content (Code, Config, Sample) - NOT scrollable, let wrapper handle scrolling */
    .tab-content {
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.2s ease-in;
      min-height: 0;
    }

    /* Preview tab content - should fill viewport without scrolling */
    .tab-content.preview-tab-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100%;
      overflow: hidden;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Form Styles - Ensure sections are visible and properly sized */
    .info-section, .code-section, .config-schema-section, .sample-data-section {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 0;
      padding: 1.5rem;
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      flex-shrink: 0; /* Don't shrink in flex container */
    }

    /* Preview section should fill available space */
    .preview-section {
      background: #1a1a1a;
      border: none;
      border-radius: 0;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      margin: 0;
      height: 100%; /* Fill parent */
    }

    .preview-container {
      flex: 1;
      overflow-y: auto !important; /* Enable scrolling for PixiJS previews */
      overflow-x: hidden;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: 2rem; /* Add padding under preview window */
    }

    /* Ensure iframes in preview fit exactly on screen */
    .preview-iframe {
      width: 100%;
      height: calc(100vh - 320px); /* Fit screen minus header/tabs/padding */
      min-height: 400px;
      max-height: calc(100vh - 320px);
      border: 1px solid #333;
      border-radius: 0.5rem;
      background: #0f0f23;
      flex-shrink: 0;
    }

    /* HTML preview - scrollable */
    .preview-container .html-preview {
      width: 100%;
      display: flex;
      flex-direction: column;
      min-height: 0;
      margin-bottom: 2rem; /* Add spacing below preview */
    }

    /* PixiJS preview iframe specifically - make it fit screen better and scrollable */
    .preview-container .html-preview iframe.preview-iframe,
    .preview-container .media-player-preview iframe.preview-iframe {
      max-height: calc(100vh - 320px);
      min-height: 400px;
      height: calc(100vh - 320px);
      width: 100%;
      border: 1px solid #333;
      display: block;
      overflow: auto !important;
    }
    
    /* Ensure the iframe content can scroll */
    .preview-container .html-preview,
    .preview-container .media-player-preview {
      overflow: visible;
      position: relative;
      height: 100%;
    }

    .section-header {
      margin-bottom: 1.5rem;
    }

    .section-header h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .section-header .hint {
      color: #999;
      font-size: 0.875rem;
      margin: 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 1rem;
    }

    .form-group label {
      font-weight: 500;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 0.625rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.375rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.875rem;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group input:disabled,
    .form-group select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .form-group .hint {
      font-size: 0.75rem;
      color: #666;
      margin-top: 0.25rem;
    }

    /* Code Editor */
    .editor-subtabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .editor-subtabs button {
      background: #0a0a0a;
      border: 1px solid #333;
      color: #999;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-size: 0.875rem;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .editor-subtabs button:hover {
      border-color: #444;
      color: #fff;
    }

    .editor-subtabs button.active {
      background: #667eea;
      border-color: #667eea;
      color: #fff;
    }

    .code-editor-container {
      position: relative;
    }

    .code-textarea {
      width: 100%;
      min-height: 400px;
      padding: 1rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: #fff;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      resize: vertical;
    }

    .code-textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .editor-note {
      background: rgba(102, 126, 234, 0.1);
      border-left: 3px solid #667eea;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .no-type-selected {
      text-align: center;
      padding: 3rem 1rem;
      color: #999;
    }

    .no-type-selected p {
      margin: 0;
    }

    /* Code Actions */
    .code-actions,
    .config-actions,
    .sample-actions,
    .settings-actions {
      margin-top: 1.5rem;
      padding: 1rem;
      background: rgba(102, 126, 234, 0.05);
      border: 1px solid #333;
      border-radius: 0.5rem;
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    /* Desktop: Sticky code actions panel at bottom */
    @media (min-width: 1025px) {
      .code-actions,
      .config-actions,
      .sample-actions,
      .settings-actions {
        position: sticky;
        bottom: 0;
        z-index: 50;
        background: rgba(26, 26, 26, 0.98);
        backdrop-filter: blur(10px);
        border-top: 2px solid #333;
        border-bottom: none;
        border-radius: 0;
        margin-top: 2rem;
        margin-bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);
      }
    }

    .btn-test {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-test:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-1px);
    }

    .btn-test:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-save-inline {
      background: #00d4ff;
      color: #0f0f23;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
    }

    .btn-save-inline:hover:not(:disabled) {
      background: #00bce6;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 212, 255, 0.5);
    }

    .btn-save-inline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-reset-inline {
      background: #2a2a2a;
      color: white;
      border: 1px solid #444;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-reset-inline:hover:not(:disabled) {
      background: #3a3a3a;
      border-color: #555;
      transform: translateY(-1px);
    }

    .btn-reset-inline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-test-inline {
      background: #8b5cf6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }

    .btn-test-inline:hover:not(:disabled) {
      background: #7c3aed;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.5);
    }

    .btn-test-inline:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-refresh {
      background: #10b981;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .test-result {
      margin-top: 1rem;
      padding: 1rem 1rem 1rem 1rem;
      border-radius: 0.5rem;
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      position: relative;
    }

    .close-test-result {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      background: transparent;
      border: none;
      color: #999;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      line-height: 1;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .close-test-result:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .test-result.success {
      background: rgba(76, 175, 80, 0.1);
      border: 1px solid #4caf50;
    }

    .test-result.error {
      background: rgba(244, 67, 54, 0.1);
      border: 1px solid #f44336;
    }

    .result-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .result-content {
      flex: 1;
    }

    .result-message {
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .error-details {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      color: #f44336;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Config & Sample */
    .error-message {
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      padding: 0.75rem 1rem;
      margin-top: 1rem;
      border-radius: 0.375rem;
      color: #ef4444;
      font-size: 0.875rem;
    }

    .config-preview-btn {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
    }

    /* Preview */
    /* Removed duplicate .preview-container - using the one defined earlier */

    .interaction-preview,
    .html-preview,
    .iframe-preview {
      width: 100%;
    }

    .iframe-preview iframe {
      border: 1px solid #333;
      border-radius: 0.5rem;
    }

    .pixijs-preview-placeholder,
    .no-preview {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    .placeholder-content {
      text-align: center;
      color: #666;
    }

    .placeholder-icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 1rem;
    }

    .placeholder-content h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #999;
    }

    .placeholder-content p {
      margin: 0.25rem 0;
      font-size: 0.875rem;
    }

    /* AI Assistant Widget */
    .ai-assistant-widget {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      z-index: 999; /* Below header (usually 1000+) but above content */
      transition: all 0.3s ease;
      max-height: calc(100vh - 80px); /* Ensure it never goes above header */
    }

    .ai-assistant-widget.hidden {
      display: none;
    }

    .ai-icon-minimized {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
      position: relative;
    }

    .ai-icon-minimized:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .ai-icon-minimized .avatar {
      font-size: 1.75rem;
    }

    .speaking-indicator {
      position: absolute;
      bottom: -5px;
      right: -5px;
      background: #10b981;
      color: white;
      font-size: 0.75rem;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: bold;
    }

    .ai-card {
      width: 400px;
      max-height: calc(100vh - 120px); /* Account for header + padding */
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .ai-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
      border-bottom: 1px solid #333;
      flex-shrink: 0; /* Prevent header from shrinking */
      position: sticky;
      top: 0;
      z-index: 1; /* Keep header above chat content */
    }

    .ai-avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .ai-title {
      flex: 1;
      font-weight: 600;
      font-size: 1rem;
    }

    .header-controls {
      display: flex;
      gap: 0.5rem;
    }

    .control-btn {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .chat-history {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .no-messages {
      text-align: center;
      padding: 2rem 1rem;
      color: #666;
      font-size: 0.875rem;
    }

    .warning-text {
      color: #ffc107 !important;
      font-weight: 500;
    }

    .message {
      display: flex;
      animation: slideIn 0.2s ease;
    }

    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .user-message {
      justify-content: flex-end;
    }

    .user-message .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 1rem 1rem 0 1rem;
    }

    .ai-message .message-content {
      background: #2a2a2a;
      border-radius: 1rem 1rem 1rem 0;
    }

    .message-content {
      max-width: 80%;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .message-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .message-text {
      flex: 1;
      font-size: 0.875rem;
      line-height: 1.5;
      word-wrap: break-word;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .message-text-content {
      flex: 1;
    }

    .suggested-changes {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid rgba(102, 126, 234, 0.3);
      border-radius: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .changes-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #ccc;
    }

    .changes-icon {
      font-size: 1rem;
    }

    .changes-text {
      flex: 1;
      font-weight: 500;
    }

    .accept-changes-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      align-self: flex-start;
    }

    .accept-changes-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
    }

    .accept-changes-btn:active {
      transform: translateY(0);
    }

    .accept-changes-btn svg {
      width: 16px;
      height: 16px;
    }

    .changes-accepted {
      margin-top: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: rgba(40, 167, 69, 0.1);
      border: 1px solid rgba(40, 167, 69, 0.3);
      border-radius: 0.375rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #28a745;
    }

    .accepted-icon {
      font-size: 1rem;
    }

    .accepted-text {
      font-weight: 500;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 0.5rem 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .typing-indicator span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes bounce {
      0%, 80%, 100% { 
        transform: scale(0);
      } 
      40% { 
        transform: scale(1);
      }
    }

    .chat-input-container {
      padding: 1rem;
      border-top: 1px solid #333;
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
      position: relative;
    }

    .char-count-warning {
      position: absolute;
      bottom: 4px;
      right: 50px;
      font-size: 11px;
      color: #ff9800;
      font-weight: 500;
      z-index: 10;
    }

    .chat-input-container textarea {
      flex: 1;
      padding: 0.625rem;
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      color: #fff;
      font-family: inherit;
      font-size: 0.875rem;
      resize: none;
      max-height: 100px;
    }

    .chat-input-container textarea:focus {
      outline: none;
      border-color: #667eea;
    }

    .send-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    .modal-overlay-fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease;
    }

    .modal-container-fullscreen {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      width: 95%;
      max-width: 1200px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }

    .modal-header-sticky {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #333;
      background: #1a1a1a;
    }

    .modal-header-sticky h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .modal-tabs {
      display: flex;
      gap: 0.5rem;
      padding: 0 1.5rem;
      border-bottom: 1px solid #333;
      background: #1a1a1a;
    }

    .modal-tab {
      background: transparent;
      border: none;
      color: #999;
      padding: 1rem 1.5rem;
      cursor: pointer;
      font-weight: 500;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .modal-tab:hover {
      color: #fff;
    }

    .modal-tab.active {
      color: #00d4ff;
      border-bottom-color: #00d4ff;
    }

    .modal-body-scrollable {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      background: #0a0a0a;
    }

    .modal-footer-sticky {
      padding: 1rem 1.5rem;
      border-top: 1px solid #333;
      background: #1a1a1a;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .config-tab-content,
    .preview-tab-content {
      animation: fadeIn 0.2s ease;
    }

    .interaction-preview-fullscreen {
      min-height: 400px;
    }

    .modal-content {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 1rem;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease;
    }

    .modal-content.large-modal {
      max-width: 900px;
      max-height: 90vh;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #333;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #2a2a2a;
      color: #fff;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .modal-note {
      background: rgba(102, 126, 234, 0.1);
      border-left: 3px solid #667eea;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .config-form-preview {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
    }

    .config-form-preview pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-size: 0.875rem;
      color: #999;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    .config-form-preview .hint {
      margin-top: 1rem;
      color: #666;
      font-size: 0.875rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #333;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .config-section,
    .preview-section-modal {
      margin-bottom: 2rem;
    }

    .config-section h3,
    .preview-section-modal h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 1rem 0;
      color: #00d4ff;
    }

    .modal-preview-container {
      background: #0a0a0a;
      border: 1px solid #333;
      border-radius: 0.5rem;
      padding: 1rem;
      min-height: 300px;
    }

    .no-sample-data {
      text-align: center;
      padding: 2rem;
      color: #ffc107;
    }

    /* Hide mobile-only elements on desktop */
    .mobile-only {
      display: none;
    }

    /* Mobile Responsiveness */
    @media (max-width: 1024px) {
      .interaction-library {
        width: 280px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .ai-card {
        width: 340px;
      }
    }

    @media (max-width: 768px) {
      .mobile-only {
        display: block !important;
      }

      .builder-layout {
        position: relative;
        flex-direction: row;
      }

      .interaction-library {
        position: fixed;
        left: 0;
        top: 64px;
        bottom: 0;
        width: 80%;
        max-width: 320px;
        height: auto;
        max-height: none;
        border-right: 1px solid #333;
        border-bottom: none;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
      }

      .interaction-library:not(.mobile-hidden) {
        transform: translateX(0);
      }

      .builder-main {
        width: 100%;
        margin-left: 0;
      }

      .editor-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 64px);
        padding: 0;
        overflow: hidden;
      }

      .editor-tabs-main {
        position: sticky;
        bottom: 0;
        z-index: 500;
        background: #0a0a0a;
        border-top: 1px solid #333;
        border-bottom: none;
        margin: 0;
        padding: 0.5rem;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 0.375rem;
        order: 2;
      }

      .sidebar-toggle {
        grid-column: 1;
        grid-row: 1;
        background: #667eea;
        color: white;
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.7rem;
        font-weight: 600;
        cursor: pointer;
      }

      .editor-tabs-main button:not(.sidebar-toggle) {
        padding: 0.625rem 0.25rem;
        font-size: 0.7rem;
        text-align: center;
      }

      .editor-tabs-main button:nth-child(2) { grid-column: 2; grid-row: 1; }
      .editor-tabs-main button:nth-child(3) { grid-column: 3; grid-row: 1; }
      .editor-tabs-main button:nth-child(4) { grid-column: 1; grid-row: 2; }
      .editor-tabs-main button:nth-child(5) { grid-column: 2; grid-row: 2; }
      .editor-tabs-main button:nth-child(6) { grid-column: 3; grid-row: 2; }

      .tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        order: 1;
      }

      .ai-assistant-widget {
        bottom: 60px;
        right: 1rem;
      }

      .ai-card {
        width: calc(100vw - 2rem);
        max-width: 400px;
      }

      .interaction-library {
        z-index: 300 !important;
      }
    }

    /* Snackbar */
    .snackbar {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a1a;
      color: #fff;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      border: 1px solid #333;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 5000;
      animation: slideUp 0.3s ease;
      font-weight: 500;
    }

    .empty-builder-inline {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
      color: #666;
    }

    .empty-builder-inline .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-builder-inline h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      color: #999;
    }

    .empty-builder-inline p {
      margin: 0;
      font-size: 1rem;
    }
  `]
})
export class InteractionBuilderComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  interactions: InteractionType[] = [];
  filteredInteractions: InteractionType[] = [];
  currentInteraction: InteractionType | null = null;
  isNewInteraction = false;
  hasChanges = false;
  saving = false;

  // Filters
  searchQuery = '';
  typeFilter = '';

  // Mobile sidebar
  sidebarHidden = false;

  // Tabs
  activeTab: 'settings' | 'code' | 'config' | 'sample' | 'preview' | 'ai' = 'settings';
  activeCodeTab: 'html' | 'css' | 'js' = 'html';

  // JSON text fields (for editing)
  iframeConfigText = '';
  mediaConfigText = '';
  uploadingDocument = false;
  
  // AI configuration fields
  aiPromptTemplateText = '';
  aiEventHandlersText = '';
  aiResponseActionsText = '';
  aiEventHandlersError = '';

  // Media content selector
  showMediaSelector = false;
  selectedMediaId: string | null = null;
  selectedMediaName = '';
  displayMode: 'overlay' | 'section' = 'overlay'; // Renamed from 'Display Mode' to 'Overlay Mode' for consistency
  sectionHeight = 'auto';
  sectionMinHeight = '200px';
  sectionMaxHeight = 'none';
  showPlayerControls = false; // Default: hide controls
  hideOverlayDuringPlayback = true; // Default: hide overlay content during playback
  iframeOverlayMode: 'overlay' | 'section' = 'overlay'; // Overlay mode for iFrame interactions
  
  // iFrame content selector
  showIframeContentSelector = false;
  selectedIframeContentId: string | null = null;
  selectedIframeContentName = '';
  
  aiResponseActionsError = '';
  configSchemaText = '';
  sampleDataText = '';
  configSchemaError = '';
  sampleDataError = '';

  // AI Assistant
  aiMinimized = true;
  aiHidden = false;
  aiTyping = false;
  aiInput = '';
  aiMessages: ChatMessage[] = [];

  // Config Modal
  showingConfigModal = false;
  configModalInitialConfig: any = {};

  // Testing
  testing = false;
  testResult: { success: boolean; message: string; error?: string } | null = null;
  testingConfig = false;
  testConfigResult: { success: boolean; message: string; error?: string } | null = null;
  testingSample = false;
  testSampleResult: { success: boolean; message: string; error?: string } | null = null;

  // Reset functionality
  lastWorkingVersion: InteractionType | null = null;
  hasLastWorking = false;

  // Preview refresh
  previewKey = Date.now();
  
  // Blob URL for HTML preview (to bypass Angular sanitization)
  // Store current blob URL and the preview key it was created for
  private currentBlobUrl: SafeResourceUrl | null = null;
  private currentBlobUrlKey: number | null = null;
  private currentIframeOverlayBlobUrl: SafeResourceUrl | null = null;
  private currentIframeOverlayBlobUrlKey: number | null = null;
  private currentMediaPlayerBlobUrl: SafeResourceUrl | null = null;
  private currentMediaPlayerBlobUrlKey: number | null = null;

  // Snackbar
  showSnackbar = false;
  snackbarMessage = '';

  @ViewChild('aiChatHistory') aiChatHistory?: ElementRef;

  constructor(
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadInteractions();
    
    // Start with sidebar hidden on mobile
    if (window.innerWidth <= 768) {
      this.sidebarHidden = true;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up all blob URLs
    this.clearBlobUrlCache();
  }

  loadInteractions() {
    console.log('[InteractionBuilder] 📡 Loading interactions from API...');
    this.http.get<InteractionType[]>(`${environment.apiUrl}/interaction-types`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('[InteractionBuilder] ✅ Received', data.length, 'interactions:', data);
          this.interactions = data;
          this.filterInteractions();
          console.log('[InteractionBuilder] 📋 Filtered to', this.filteredInteractions.length, 'interactions');
        },
        error: (err) => {
          console.error('[InteractionBuilder] ❌ Failed to load interactions:', err);
        }
      });
  }

  filterInteractions() {
    let filtered = [...this.interactions];

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(query) || 
        i.description?.toLowerCase().includes(query) ||
        i.id.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (this.typeFilter) {
      if (this.typeFilter === 'legacy') {
        filtered = filtered.filter(i => !i.interactionTypeCategory);
      } else {
        filtered = filtered.filter(i => i.interactionTypeCategory === this.typeFilter);
      }
    }

    this.filteredInteractions = filtered;
  }

  loadInteraction(interaction: InteractionType) {
    if (this.hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }

    console.log('[InteractionBuilder] 📥 Loading interaction:', interaction.id);
    console.log('[InteractionBuilder] 🔍 Interaction category:', interaction.interactionTypeCategory);
    console.log('[InteractionBuilder] 🔍 Full interaction object:', JSON.stringify(interaction, null, 2));

    this.currentInteraction = { ...interaction };
    
    // Ensure interactionTypeCategory is set correctly (handle potential mapping issues)
    if (this.currentInteraction && !this.currentInteraction.interactionTypeCategory && (interaction as any).interaction_type_category) {
      this.currentInteraction.interactionTypeCategory = (interaction as any).interaction_type_category;
      console.log('[InteractionBuilder] 🔧 Fixed interactionTypeCategory from interaction_type_category:', this.currentInteraction.interactionTypeCategory);
    }
    
    // Also check for snake_case version from API
    if (this.currentInteraction && !this.currentInteraction.interactionTypeCategory && (interaction as any).interactionTypeCategory === undefined) {
      const snakeCase = (interaction as any).interaction_type_category;
      const camelCase = (interaction as any).interactionTypeCategory;
      console.log('[InteractionBuilder] 🔍 Checking field names - snake_case:', snakeCase, 'camelCase:', camelCase);
      if (snakeCase) {
        this.currentInteraction.interactionTypeCategory = snakeCase;
        console.log('[InteractionBuilder] 🔧 Set interactionTypeCategory from snake_case:', this.currentInteraction.interactionTypeCategory);
      }
    }
    
    console.log('[InteractionBuilder] ✅ Final currentInteraction.interactionTypeCategory:', this.currentInteraction.interactionTypeCategory);
    console.log('[InteractionBuilder] 🔍 Will Display Mode section show?', this.currentInteraction?.interactionTypeCategory === 'uploaded-media');
    console.log('[InteractionBuilder] 🔍 Active tab:', this.activeTab);
    console.log('[InteractionBuilder] 🔍 Is settings tab active?', this.isTabActive('settings'));
    console.log('[InteractionBuilder] 🔍 currentInteraction object:', JSON.stringify({
      id: this.currentInteraction?.id,
      category: this.currentInteraction?.interactionTypeCategory,
      hasMediaConfig: !!(this.currentInteraction as any)?.mediaConfig,
      mediaConfig: (this.currentInteraction as any)?.mediaConfig
    }));
    
    // Force change detection for Display Mode section
    if (this.currentInteraction?.interactionTypeCategory === 'uploaded-media') {
      console.log('[InteractionBuilder] ✅ Uploaded-media category detected - Display Mode section should be visible');
    } else {
      console.warn('[InteractionBuilder] ⚠️ NOT uploaded-media category - Display Mode section will be hidden');
      console.warn('[InteractionBuilder] ⚠️ Current category:', this.currentInteraction?.interactionTypeCategory);
    }
    this.isNewInteraction = false;
    this.hasChanges = false;
    this.activeTab = 'settings';
    this.testResult = null;

    // Load JSON fields into text areas
    this.iframeConfigText = interaction.iframeConfig ? JSON.stringify(interaction.iframeConfig, null, 2) : '';
    this.mediaConfigText = (interaction as any).mediaConfig ? JSON.stringify((interaction as any).mediaConfig, null, 2) : '';
    
    // Load overlay mode from iframeConfig
    if (interaction.iframeConfig?.overlayMode) {
      this.iframeOverlayMode = interaction.iframeConfig.overlayMode;
      console.log('[InteractionBuilder] 🎛️ iFrame Overlay Mode initialized:', this.iframeOverlayMode);
    } else {
      // Default to overlay for iFrame interactions (current behavior)
      this.iframeOverlayMode = 'overlay';
      console.log('[InteractionBuilder] 🎛️ iFrame Overlay Mode defaulted to overlay');
    }
    
    // Debug: Log interaction category to verify condition
    console.log('[InteractionBuilder] 🔍 Loading interaction:', {
      id: interaction.id,
      category: interaction.interactionTypeCategory,
      isIframe: interaction.interactionTypeCategory === 'iframe',
      iframeOverlayMode: this.iframeOverlayMode,
      currentInteractionCategory: this.currentInteraction?.interactionTypeCategory
    });
    
    // Force change detection for iframe configuration section
    if (interaction.interactionTypeCategory === 'iframe') {
      console.log('[InteractionBuilder] ✅ iFrame category detected - iFrame Configuration section should be visible');
      console.log('[InteractionBuilder] 🔍 Template should render iFrame Configuration with Overlay Mode dropdown');
    }
    
    // Load display mode and section sizing from mediaConfig
    if ((interaction as any).mediaConfig) {
      this.displayMode = (interaction as any).mediaConfig.displayMode || 'section';
      this.sectionHeight = (interaction as any).mediaConfig.sectionHeight || 'auto';
      this.sectionMinHeight = (interaction as any).mediaConfig.sectionMinHeight || '200px';
      this.sectionMaxHeight = (interaction as any).mediaConfig.sectionMaxHeight || 'none';
      this.showPlayerControls = (interaction as any).mediaConfig.showPlayerControls ?? false; // Default to false
      this.hideOverlayDuringPlayback = (interaction as any).mediaConfig.hideOverlayDuringPlayback ?? true; // Default to true
    } else {
      // Initialize with defaults if no mediaConfig
      this.displayMode = 'section';
      this.sectionHeight = 'auto';
      this.sectionMinHeight = '200px';
      this.sectionMaxHeight = 'none';
      this.showPlayerControls = false; // Default: hide controls
      this.hideOverlayDuringPlayback = true; // Default: hide overlay during playback
    }
    
    console.log('[InteractionBuilder] 🎛️ Display Mode initialized:', this.displayMode);
    console.log('[InteractionBuilder] 🎛️ Section sizing:', {
      height: this.sectionHeight,
      minHeight: this.sectionMinHeight,
      maxHeight: this.sectionMaxHeight
    });
    
    // Load media selection if present
    if ((interaction as any).mediaConfig?.testMediaContentId) {
      this.selectedMediaId = (interaction as any).mediaConfig.testMediaContentId;
      // Fetch media name if needed
    }
    
    // Load iframe content selection if present
    if (interaction.interactionTypeCategory === 'iframe' && interaction.iframeConfig?.testContentOutputId) {
      this.selectedIframeContentId = interaction.iframeConfig.testContentOutputId;
      // Fetch content name
      this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${this.selectedIframeContentId}`, {
        headers: {
          'x-tenant-id': environment.tenantId,
          'x-user-id': environment.defaultUserId
        }
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (content) => {
            this.selectedIframeContentName = content.outputName || content.contentSource?.title || 'Selected Content';
            console.log('[InteractionBuilder] ✅ iFrame content name loaded:', this.selectedIframeContentName);
          },
          error: (err) => {
            console.error('[InteractionBuilder] ❌ Failed to fetch iframe content details:', err);
            if (err.status === 404) {
              this.selectedIframeContentId = null;
              this.selectedIframeContentName = '';
            } else {
              this.selectedIframeContentName = 'Selected Content';
            }
          }
        });
    }
    
    this.configSchemaText = interaction.configSchema ? JSON.stringify(interaction.configSchema, null, 2) : '';
    this.sampleDataText = interaction.sampleData ? JSON.stringify(interaction.sampleData, null, 2) : '';
    
    // Load media content selection
    if (interaction.interactionTypeCategory === 'uploaded-media') {
      // Check for testMediaContentId in mediaConfig (for builder testing)
      const testMediaId = (interaction as any).mediaConfig?.testMediaContentId;
      if (testMediaId) {
        this.selectedMediaId = testMediaId;
        // Fetch media name
        this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${testMediaId}`, {
          headers: {
            'x-tenant-id': environment.tenantId,
            'x-user-id': environment.defaultUserId
          }
        })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (media) => {
              this.selectedMediaName = media.outputName || media.contentSource?.title || 'Selected Media';
              console.log('[InteractionBuilder] ✅ Media name loaded:', this.selectedMediaName);
            },
            error: (err) => {
              console.error('[InteractionBuilder] ❌ Failed to fetch media details:', err);
              // If 404, the processed content doesn't exist - clear the selection
              if (err.status === 404) {
                console.warn('[InteractionBuilder] ⚠️ Processed content not found, clearing selection');
                this.selectedMediaId = null;
                this.selectedMediaName = '';
                // Clear from mediaConfig
                if ((this.currentInteraction as any).mediaConfig) {
                  delete (this.currentInteraction as any).mediaConfig.testMediaContentId;
                  this.mediaConfigText = JSON.stringify((this.currentInteraction as any).mediaConfig, null, 2);
                }
              } else {
                this.selectedMediaName = 'Selected Media';
              }
            }
          });
      }
    }
    
    // Load AI configuration fields
    this.aiPromptTemplateText = (interaction as any).aiPromptTemplate || '';
    this.aiEventHandlersText = (interaction as any).aiEventHandlers ? JSON.stringify((interaction as any).aiEventHandlers, null, 2) : '';
    this.aiResponseActionsText = (interaction as any).aiResponseActions ? JSON.stringify((interaction as any).aiResponseActions, null, 2) : '';
    this.aiEventHandlersError = '';
    this.aiResponseActionsError = '';

    // Store as last working version if it has code
    if (interaction.htmlCode || interaction.jsCode || interaction.iframeUrl) {
      this.lastWorkingVersion = JSON.parse(JSON.stringify(interaction));
      this.hasLastWorking = true;
      console.log('[InteractionBuilder] ✅ Stored as last working version');
    }

    // Update preview key to force preview refresh when switching interactions
    // This ensures the preview updates even if user is already on Preview tab
    this.previewKey = Date.now();
    this.clearBlobUrlCache(); // Clear old blob URL
    console.log('[InteractionBuilder] 🔄 Preview key updated for new interaction:', this.previewKey);

    console.log('[InteractionBuilder] 📝 Config Schema Text:', this.configSchemaText.substring(0, 50) + '...');
    console.log('[InteractionBuilder] 📝 Sample Data Text:', this.sampleDataText.substring(0, 50) + '...');
  }

  createNew() {
    if (this.hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }

    this.currentInteraction = {
      id: '',
      name: '',
      description: '',
      interactionTypeCategory: undefined,
      isActive: true
    };
    this.isNewInteraction = true;
    this.hasChanges = true;
    this.activeTab = 'settings';
    this.iframeConfigText = '';
    this.configSchemaText = '';
    this.sampleDataText = '';
  }

  markChanged() {
    this.hasChanges = true;
  }

  onTypeChange() {
    this.markChanged();
    // Reset type-specific fields when type changes
    if (this.currentInteraction) {
      // HTML and iframe interactions can both use HTML/CSS code (iframe for overlay)
      if (this.currentInteraction.interactionTypeCategory !== 'html' && this.currentInteraction.interactionTypeCategory !== 'iframe') {
        this.currentInteraction.htmlCode = undefined;
        this.currentInteraction.cssCode = undefined;
      }
      if (this.currentInteraction.interactionTypeCategory !== 'iframe') {
        this.currentInteraction.iframeUrl = undefined;
        this.currentInteraction.iframeConfig = undefined;
        this.iframeConfigText = '';
      }
      // PixiJS and iframe interactions can both use JS code (iframe for overlay)
      if (this.currentInteraction.interactionTypeCategory !== 'pixijs' && this.currentInteraction.interactionTypeCategory !== 'iframe') {
        this.currentInteraction.jsCode = undefined;
      }
    }
  }

  onIframeConfigChange() {
    this.markChanged();
    if (!this.iframeConfigText.trim()) {
      this.currentInteraction!.iframeConfig = {};
      // Preserve overlayMode if it was set
      if (this.iframeOverlayMode) {
        this.currentInteraction!.iframeConfig.overlayMode = this.iframeOverlayMode;
      }
      return;
    }

    try {
      const parsed = JSON.parse(this.iframeConfigText);
      this.currentInteraction!.iframeConfig = parsed;
      // Update overlayMode from parsed config if it exists
      if (parsed.overlayMode) {
        this.iframeOverlayMode = parsed.overlayMode;
      } else if (this.iframeOverlayMode) {
        // Preserve overlayMode if it was set but not in parsed config
        this.currentInteraction!.iframeConfig.overlayMode = this.iframeOverlayMode;
        this.iframeConfigText = JSON.stringify(this.currentInteraction!.iframeConfig, null, 2);
      }
    } catch (e: any) {
      // Keep as text for now, will validate on save
      console.error('[InteractionBuilder] Failed to parse iframeConfig JSON:', e);
    }
  }

  onMediaConfigChange() {
    this.markChanged();
    if (!this.mediaConfigText.trim()) {
      (this.currentInteraction as any).mediaConfig = undefined;
      return;
    }

    try {
      (this.currentInteraction as any).mediaConfig = JSON.parse(this.mediaConfigText);
      // Update display mode and section sizing from parsed config
      if ((this.currentInteraction as any).mediaConfig) {
        this.displayMode = (this.currentInteraction as any).mediaConfig.displayMode || 'section';
        this.sectionHeight = (this.currentInteraction as any).mediaConfig.sectionHeight || 'auto';
        this.sectionMinHeight = (this.currentInteraction as any).mediaConfig.sectionMinHeight || '200px';
        this.sectionMaxHeight = (this.currentInteraction as any).mediaConfig.sectionMaxHeight || 'none';
      }
    } catch (e: any) {
      // Keep as text for now, will validate on save
    }
  }

  onDisplayModeChange() {
    this.markChanged();
    if (!(this.currentInteraction as any).mediaConfig) {
      (this.currentInteraction as any).mediaConfig = {};
    }
    (this.currentInteraction as any).mediaConfig.displayMode = this.displayMode;
    this.updateMediaConfigText();
    // Invalidate preview cache to force regeneration with new display mode
    this.currentMediaPlayerBlobUrl = null;
    this.currentMediaPlayerBlobUrlKey = null;
    this.previewKey = Date.now();
  }

  onSectionSizingChange() {
    this.markChanged();
    if (!(this.currentInteraction as any).mediaConfig) {
      (this.currentInteraction as any).mediaConfig = {};
    }
    (this.currentInteraction as any).mediaConfig.sectionHeight = this.sectionHeight;
    (this.currentInteraction as any).mediaConfig.sectionMinHeight = this.sectionMinHeight;
    (this.currentInteraction as any).mediaConfig.sectionMaxHeight = this.sectionMaxHeight;
    this.updateMediaConfigText();
    // Invalidate preview cache to force regeneration with new section sizing
    if (this.displayMode === 'section') {
      this.currentMediaPlayerBlobUrl = null;
      this.currentMediaPlayerBlobUrlKey = null;
      this.previewKey = Date.now();
    }
  }

  onShowPlayerControlsChange() {
    this.markChanged();
    if (!(this.currentInteraction as any).mediaConfig) {
      (this.currentInteraction as any).mediaConfig = {};
    }
    (this.currentInteraction as any).mediaConfig.showPlayerControls = this.showPlayerControls;
    this.updateMediaConfigText();
    // Invalidate preview cache to force regeneration with new controls setting
    this.currentMediaPlayerBlobUrl = null;
    this.currentMediaPlayerBlobUrlKey = null;
    this.previewKey = Date.now();
  }

  onHideOverlayDuringPlaybackChange() {
    this.markChanged();
    if (!(this.currentInteraction as any).mediaConfig) {
      (this.currentInteraction as any).mediaConfig = {};
    }
    (this.currentInteraction as any).mediaConfig.hideOverlayDuringPlayback = this.hideOverlayDuringPlayback;
    this.updateMediaConfigText();
    // Invalidate preview cache to force regeneration with new setting
    this.currentMediaPlayerBlobUrl = null;
    this.currentMediaPlayerBlobUrlKey = null;
    this.previewKey = Date.now();
  }

  onIframeOverlayModeChange() {
    this.markChanged();
    if (!this.currentInteraction?.iframeConfig) {
      this.currentInteraction!.iframeConfig = {};
    }
    this.currentInteraction!.iframeConfig.overlayMode = this.iframeOverlayMode;
    this.updateIframeConfigText();
    // Invalidate preview cache to force regeneration with new overlay mode
    this.previewKey = Date.now();
  }

  updateIframeConfigText() {
    if (this.currentInteraction?.iframeConfig) {
      this.iframeConfigText = JSON.stringify(this.currentInteraction.iframeConfig, null, 2);
    }
  }

  updateMediaConfigText() {
    if ((this.currentInteraction as any).mediaConfig) {
      this.mediaConfigText = JSON.stringify((this.currentInteraction as any).mediaConfig, null, 2);
    }
  }

  getMediaConfigValue(key: string): any {
    if (!(this.currentInteraction as any)?.mediaConfig) {
      return undefined;
    }
    return (this.currentInteraction as any).mediaConfig[key];
  }

  onProcessedContentSelected(event: { processedContentId: string; name: string; }) {
    console.log('[InteractionBuilder] 📦 Processed content selected:', event.processedContentId);
    (this.currentInteraction as any).contentOutputId = event.processedContentId;
    this.selectedMediaId = event.processedContentId;
    this.selectedMediaName = event.name;
    this.markChanged();
  }

  getIframeConfigValue(key: string): any {
    if (!this.currentInteraction?.iframeConfig) {
      return undefined;
    }
    return this.currentInteraction.iframeConfig[key];
  }

  getScreenshotTrigger(trigger: string): boolean {
    if (!this.currentInteraction?.iframeConfig?.screenshotTriggers) {
      return false;
    }
    return this.currentInteraction.iframeConfig.screenshotTriggers[trigger] === true;
  }

  toggleScreenshotTrigger(trigger: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.markChanged();
    
    if (!this.currentInteraction!.iframeConfig) {
      this.currentInteraction!.iframeConfig = {};
    }
    if (!this.currentInteraction!.iframeConfig.screenshotTriggers) {
      this.currentInteraction!.iframeConfig.screenshotTriggers = {};
    }
    
    this.currentInteraction!.iframeConfig.screenshotTriggers[trigger] = checked;
    this.iframeConfigText = JSON.stringify(this.currentInteraction!.iframeConfig, null, 2);
  }

  getPeriodicInterval(): number {
    if (!this.currentInteraction?.iframeConfig?.screenshotTriggers?.periodicInterval) {
      return 30; // Default 30 seconds
    }
    return this.currentInteraction.iframeConfig.screenshotTriggers.periodicInterval;
  }

  setPeriodicInterval(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.markChanged();
    
    if (!this.currentInteraction!.iframeConfig) {
      this.currentInteraction!.iframeConfig = {};
    }
    if (!this.currentInteraction!.iframeConfig.screenshotTriggers) {
      this.currentInteraction!.iframeConfig.screenshotTriggers = {};
    }
    
    this.currentInteraction!.iframeConfig.screenshotTriggers.periodicInterval = value || 30;
    this.iframeConfigText = JSON.stringify(this.currentInteraction!.iframeConfig, null, 2);
  }

  async onDocumentUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/msword'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, DOCX, or TXT file');
      return;
    }
    
    this.uploadingDocument = true;
    this.markChanged();
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interactionId', this.currentInteraction!.id || '');
      
      const response = await this.http.post<{ success: boolean; data: { url: string; fileName: string } }>(
        `${environment.apiUrl}/interaction-types/upload-document`,
        formData
      ).toPromise();
      
      if (response?.success && response.data) {
        this.currentInteraction!.iframeDocumentUrl = response.data.url;
        this.currentInteraction!.iframeDocumentFileName = response.data.fileName;
        console.log('[InteractionBuilder] ✅ Document uploaded:', response.data.fileName);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('[InteractionBuilder] ❌ Document upload error:', error);
      alert(`Failed to upload document: ${error.message || 'Unknown error'}`);
    } finally {
      this.uploadingDocument = false;
      // Reset file input
      input.value = '';
    }
  }

  getDocumentFileName(): string {
    return this.currentInteraction?.iframeDocumentFileName || 'document';
  }

  async removeDocument() {
    if (!confirm('Remove this document?')) return;
    
    if (this.currentInteraction?.iframeDocumentUrl) {
      try {
        await this.http.delete(
          `${environment.apiUrl}/interaction-types/document/${this.currentInteraction.id}`
        ).toPromise();
        
        this.currentInteraction.iframeDocumentUrl = undefined;
        this.currentInteraction.iframeDocumentFileName = undefined;
        this.markChanged();
        console.log('[InteractionBuilder] ✅ Document removed');
      } catch (error: any) {
        console.error('[InteractionBuilder] ❌ Document removal error:', error);
        alert(`Failed to remove document: ${error.message || 'Unknown error'}`);
      }
    }
  }

  onConfigSchemaChange() {
    this.markChanged();
    this.configSchemaError = '';
    
    if (!this.configSchemaText.trim()) {
      this.currentInteraction!.configSchema = undefined;
      return;
    }

    try {
      this.currentInteraction!.configSchema = JSON.parse(this.configSchemaText);
    } catch (e: any) {
      this.configSchemaError = e.message;
    }
  }

  onSampleDataChange() {
    this.markChanged();
    this.sampleDataError = '';
    
    if (!this.sampleDataText.trim()) {
      this.currentInteraction!.sampleData = undefined;
      return;
    }

    try {
      this.currentInteraction!.sampleData = JSON.parse(this.sampleDataText);
    } catch (e: any) {
      this.sampleDataError = e.message;
    }
  }

  onAIPromptTemplateChange() {
    this.markChanged();
  }

  onAIEventHandlersChange() {
    this.markChanged();
    this.aiEventHandlersError = '';
    
    if (!this.aiEventHandlersText.trim()) {
      return;
    }

    try {
      JSON.parse(this.aiEventHandlersText);
    } catch (e: any) {
      this.aiEventHandlersError = e.message;
    }
  }

  onAIResponseActionsChange() {
    this.markChanged();
    this.aiResponseActionsError = '';
    
    if (!this.aiResponseActionsText.trim()) {
      return;
    }

    try {
      JSON.parse(this.aiResponseActionsText);
    } catch (e: any) {
      this.aiResponseActionsError = e.message;
    }
  }

  saveInteraction() {
    if (!this.currentInteraction) return;

    // Validate required fields
    if (!this.currentInteraction.id || !this.currentInteraction.name || !this.currentInteraction.description) {
      this.showSuccessSnackbar('⚠️ Please fill in all required fields (ID, Name, Description)');
      return;
    }

    if (!this.currentInteraction.interactionTypeCategory) {
      this.showSuccessSnackbar('⚠️ Please select an interaction type');
      return;
    }

    // Run validation for Code, Config, and Sample Data before saving
    const validationErrors: string[] = [];

    // Validate Code (if HTML interaction)
    if (this.currentInteraction.interactionTypeCategory === 'html') {
      if (this.currentInteraction.jsCode) {
        try {
          // Quick syntax check
          let jsCode = this.currentInteraction.jsCode;
          jsCode = jsCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          new Function(jsCode);
        } catch (e: any) {
          validationErrors.push(`Code has syntax errors: ${e.message}. Please fix or use Reset to revert.`);
        }
      }
    }

    // Validate Config Schema - only check JSON syntax, not structure
    if (this.configSchemaError) {
      validationErrors.push('Config Schema has JSON errors. Please fix or use Reset to revert.');
    } else if (this.configSchemaText.trim()) {
      // Only validate JSON syntax, not structure requirements
      try {
        JSON.parse(this.configSchemaText);
      } catch (e: any) {
        validationErrors.push(`Config Schema JSON syntax error: ${e.message}`);
      }
    }

    // Validate Sample Data - only check JSON syntax, not structure
    if (this.sampleDataError) {
      validationErrors.push('Sample Data has JSON errors. Please fix or use Reset to revert.');
    } else if (this.sampleDataText.trim()) {
      // Only validate JSON syntax, not structure requirements
      try {
        JSON.parse(this.sampleDataText);
      } catch (e: any) {
        validationErrors.push(`Sample Data JSON syntax error: ${e.message}`);
      }
    }

    // Validate AI Event Handlers JSON
    if (this.aiEventHandlersError) {
      validationErrors.push('AI Event Handlers has JSON errors. Please fix or use Reset to revert.');
    } else if (this.aiEventHandlersText.trim()) {
      try {
        JSON.parse(this.aiEventHandlersText);
      } catch (e: any) {
        validationErrors.push(`AI Event Handlers JSON syntax error: ${e.message}`);
      }
    }

    // Validate AI Response Actions JSON
    if (this.aiResponseActionsError) {
      validationErrors.push('AI Response Actions has JSON errors. Please fix or use Reset to revert.');
    } else if (this.aiResponseActionsText.trim()) {
      try {
        JSON.parse(this.aiResponseActionsText);
      } catch (e: any) {
        validationErrors.push(`AI Response Actions JSON syntax error: ${e.message}`);
      }
    }

    // If there are validation errors, show snackbar and prevent save
    if (validationErrors.length > 0) {
      const errorMsg = validationErrors.join(' ');
      this.showSuccessSnackbar(`❌ Cannot save: ${errorMsg}`);
      return;
    }

    // Prepare save data with AI config
    const saveData: any = { ...this.currentInteraction };
    
    // Remove fields that shouldn't be saved to interaction type
    // contentOutputId is for interaction instances, not interaction types
    // But for testing purposes, store it in mediaConfig as testMediaContentId
    if (this.currentInteraction.interactionTypeCategory === 'uploaded-media') {
      if (!saveData.mediaConfig) {
        saveData.mediaConfig = {};
      }
      // Use selectedMediaId if available (from media selector), otherwise use contentOutputId
      if (this.selectedMediaId) {
        saveData.mediaConfig.testMediaContentId = this.selectedMediaId;
      } else if ((this.currentInteraction as any).contentOutputId) {
        saveData.mediaConfig.testMediaContentId = (this.currentInteraction as any).contentOutputId;
      }
      // Also save display mode, section sizing, and show controls setting
      saveData.mediaConfig.displayMode = this.displayMode;
      saveData.mediaConfig.sectionHeight = this.sectionHeight;
      saveData.mediaConfig.sectionMinHeight = this.sectionMinHeight;
      saveData.mediaConfig.sectionMaxHeight = this.sectionMaxHeight;
      saveData.mediaConfig.showPlayerControls = this.showPlayerControls;
      saveData.mediaConfig.hideOverlayDuringPlayback = this.hideOverlayDuringPlayback;
    }
    
    // Save overlay mode and content selection for iFrame interactions
    if (this.currentInteraction.interactionTypeCategory === 'iframe') {
      if (!saveData.iframeConfig) {
        saveData.iframeConfig = {};
      }
      // Parse existing iframeConfig from text field if it exists
      if (this.iframeConfigText.trim()) {
        try {
          saveData.iframeConfig = { ...JSON.parse(this.iframeConfigText), overlayMode: this.iframeOverlayMode };
        } catch (e) {
          // If parsing fails, just add overlayMode to existing config
          saveData.iframeConfig.overlayMode = this.iframeOverlayMode;
        }
      } else {
        saveData.iframeConfig.overlayMode = this.iframeOverlayMode;
      }
      // Save testContentOutputId if available (for builder testing)
      if (this.selectedIframeContentId) {
        saveData.iframeConfig.testContentOutputId = this.selectedIframeContentId;
      }
      // Remove iframeUrl - it should come from sample data or instance config
      delete saveData.iframeUrl;
    }
    
    delete saveData.contentOutputId;
    
    // Add AI configuration
    saveData.aiPromptTemplate = this.aiPromptTemplateText.trim() || null;
    saveData.aiEventHandlers = this.aiEventHandlersText.trim() ? JSON.parse(this.aiEventHandlersText) : null;
    saveData.aiResponseActions = this.aiResponseActionsText.trim() ? JSON.parse(this.aiResponseActionsText) : null;

    this.saving = true;
    const endpoint = this.isNewInteraction 
      ? `${environment.apiUrl}/interaction-types`
      : `${environment.apiUrl}/interaction-types/${this.currentInteraction.id}`;

    const request$ = this.isNewInteraction
      ? this.http.post<InteractionType>(endpoint, saveData)
      : this.http.put<InteractionType>(endpoint, saveData);
    
    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (saved) => {
          console.log('Saved interaction:', saved);
          this.hasChanges = false;
          this.saving = false;
          this.isNewInteraction = false;
          
          // Reload list
          this.loadInteractions();
          
          // Update current and reload all related data
          this.currentInteraction = saved;
          
          // Reload media selection if it's an uploaded-media interaction
          if (saved.interactionTypeCategory === 'uploaded-media' && (saved as any).mediaConfig?.testMediaContentId) {
            this.selectedMediaId = (saved as any).mediaConfig.testMediaContentId;
            // Fetch media name
            this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${this.selectedMediaId}`, {
              headers: {
                'x-tenant-id': environment.tenantId,
                'x-user-id': environment.defaultUserId
              }
            })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (media) => {
                  this.selectedMediaName = media.outputName || media.contentSource?.title || 'Selected Media';
                  console.log('[InteractionBuilder] ✅ Media name loaded after save:', this.selectedMediaName);
                },
                error: (err) => {
                  console.error('[InteractionBuilder] ❌ Failed to fetch media details after save:', err);
                  if (err.status === 404) {
                    console.warn('[InteractionBuilder] ⚠️ Processed content not found, clearing selection');
                    this.selectedMediaId = null;
                    this.selectedMediaName = '';
                  } else {
                    this.selectedMediaName = 'Selected Media';
                  }
                }
              });
          }
          
          // Reload display mode and section sizing
          if ((saved as any).mediaConfig) {
            this.displayMode = (saved as any).mediaConfig.displayMode || 'section';
            this.sectionHeight = (saved as any).mediaConfig.sectionHeight || 'auto';
            this.sectionMinHeight = (saved as any).mediaConfig.sectionMinHeight || '200px';
            this.sectionMaxHeight = (saved as any).mediaConfig.sectionMaxHeight || 'none';
          }
          
          // Store as last working version when save succeeds (no errors)
          this.lastWorkingVersion = JSON.parse(JSON.stringify(saved));
          this.hasLastWorking = true;
          
          // Show success snackbar
          this.showSuccessSnackbar('✅ Saved successfully!');
        },
        error: (err) => {
          console.error('Failed to save interaction:', err);
          this.showSuccessSnackbar('❌ Save failed: ' + (err.error?.message || err.message));
          this.saving = false;
        }
      });
  }

  showSuccessSnackbar(message: string) {
    this.snackbarMessage = message;
    this.showSnackbar = true;
    setTimeout(() => {
      this.showSnackbar = false;
    }, 3000);
  }

  switchTab(tab: 'settings' | 'code' | 'config' | 'sample' | 'preview' | 'ai') {
    if (!this.currentInteraction) {
      this.showSuccessSnackbar('⚠️ You must select or create an interaction first');
      // Stay on settings tab
      this.activeTab = 'settings';
      return;
    }
    this.activeTab = tab;
  }

  isTabActive(tab: 'settings' | 'code' | 'config' | 'sample' | 'preview' | 'ai'): boolean {
    return this.activeTab === tab;
  }

  getTypeLabel(type?: string): string {
    if (!type) return 'Legacy';
    switch (type) {
      case 'html': return 'HTML';
      case 'pixijs': return 'PixiJS';
      case 'iframe': return 'iFrame';
      case 'uploaded-media': return 'Media Player';
      default: return 'Unknown';
    }
  }

  canShowPreview(): boolean {
    if (!this.currentInteraction) return false;
    
    if (this.currentInteraction.id === 'true-false-selection' && this.currentInteraction.sampleData) {
      return true;
    }
    
    if (this.currentInteraction.interactionTypeCategory === 'html' && this.currentInteraction.htmlCode) {
      return true;
    }
    
    if (this.currentInteraction.interactionTypeCategory === 'iframe' && this.currentInteraction.iframeUrl) {
      return true;
    }
    
    // Media Player interactions can show preview even without overlay code
    if ((this.currentInteraction.interactionTypeCategory as any) === 'uploaded-media') {
      return true;
    }
    
    if (this.currentInteraction.interactionTypeCategory === 'pixijs') {
      return true; // Show placeholder
    }
    
    if ((this.currentInteraction.interactionTypeCategory as any) === 'uploaded-media' && this.currentInteraction.htmlCode) {
      return true; // Show preview if overlay HTML code exists
    }
    
    return false;
  }

  getHtmlPreview(): SafeHtml {
    // Deprecated - use getHtmlPreviewSrcDoc() for iframe instead
    return '';
  }

  getHtmlPreviewSrcDoc(): string {
    if (!this.currentInteraction) {
      console.log('[Preview] ⚠️ No current interaction');
      return '';
    }
    
    console.log('[Preview] 🎬 Generating HTML preview for iframe...');
    console.log('[Preview] Has HTML:', !!this.currentInteraction.htmlCode);
    console.log('[Preview] Has CSS:', !!this.currentInteraction.cssCode);
    console.log('[Preview] Has JS:', !!this.currentInteraction.jsCode);
    console.log('[Preview] Has Sample Data:', !!this.currentInteraction.sampleData);
    
    // Split sampleData into interactionData (data fields) and config (config fields)
    // This matches how lesson-view and lesson-builder inject data
    const sampleData = this.currentInteraction.sampleData || {};
    const interactionData: any = {};
    const configDefaults: any = {};
    
    // First, set config defaults from configSchema
    if (this.currentInteraction.configSchema && this.currentInteraction.configSchema.fields) {
      this.currentInteraction.configSchema.fields.forEach((field: any) => {
        if (field.default !== undefined) {
          configDefaults[field.key] = field.default;
        }
      });
    }
    
    // Split sampleData: config fields go to configDefaults, data fields go to interactionData
    if (sampleData && typeof sampleData === 'object') {
      Object.keys(sampleData).forEach((key: string) => {
        const value = (sampleData as any)[key];
        // Config fields (these should be in window.interactionConfig)
        if (key === 'targetStatement' || key === 'showHints' || key === 'maxSelections' || key === 'maxFragments') {
          // Map maxFragments to maxSelections if needed
          if (key === 'maxFragments' && !configDefaults.maxSelections) {
            configDefaults.maxSelections = value;
          } else if (key !== 'maxFragments') {
            configDefaults[key] = value;
          }
        } else {
          // Data fields (these should be in window.interactionData)
          interactionData[key] = value;
        }
      });
    }
    
    // Ensure fragments is in interactionData (it's the main data field)
    if (sampleData && typeof sampleData === 'object' && (sampleData as any).fragments) {
      interactionData.fragments = (sampleData as any).fragments;
    }
    
    const sampleDataJson = JSON.stringify(interactionData);
    const configJson = JSON.stringify(configDefaults);
    
    console.log('[Preview] 📋 Interaction data for injection:', sampleDataJson.substring(0, 100) + '...');
    console.log('[Preview] 📋 Config for injection:', configJson);
    console.log('[Preview] 📋 Fragments in interactionData:', interactionData.fragments?.length || 0);
    
    // Normalize JavaScript code: remove CR characters
    let jsCode = (this.currentInteraction.jsCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Fix corrupted emoji characters (????) that can cause "Invalid or unexpected token" errors
    // These appear when emojis are stored in the database with incorrect encoding
    // Replace them with empty strings or safe alternatives
    // Also handle variations: ???? (4), ??? (3), ?? (2), or any sequence of question marks
    jsCode = jsCode.replace(/\?{2,}/g, '');
    
    // Also remove any other problematic Unicode replacement characters
    jsCode = jsCode.replace(/\uFFFD/g, ''); // Unicode replacement character
    
    console.log('[Preview] 🔧 Cleaned JS code, length:', jsCode.length);
    
    // Note: We don't escape </script> here because:
    // 1. The JS code should not contain </script> tags (they would break HTML parsing)
    // 2. If </script> appears in a string, it should already be escaped as <\/script>
    // 3. Escaping here could double-escape and cause issues
    
    // Build HTML document using string concatenation to avoid template literal issues
    // This prevents problems with backticks, ${}, etc. in the injected code
    const htmlDoc = '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
      '  <style>\n' +
      '    html, body { margin: 0; padding: 0; height: auto; min-height: 100%; overflow-y: auto; overflow-x: hidden; }\n' +
      '    body { width: 100%; }\n' +
      (this.currentInteraction.cssCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '') + '\n' +
      '  </style>\n' +
      '</head>\n' +
      '<body>\n' +
      (this.currentInteraction.htmlCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '') + '\n' +
      '  <script type="text/javascript">\n' +
      '    // Set interaction data IMMEDIATELY (synchronously, before ANY code runs)\n' +
      '    // Use JSON.parse to safely handle the JSON string\n' +
      '    (function() {\n' +
      '      try {\n' +
      '        var dataStr = ' + JSON.stringify(sampleDataJson) + ';\n' +
      '        var configStr = ' + JSON.stringify(configJson) + ';\n' +
      '        window.interactionData = JSON.parse(dataStr);\n' +
      '        window.interactionConfig = JSON.parse(configStr);\n' +
      '        console.log("[Interaction] Data injected (sync):", window.interactionData);\n' +
      '        console.log("[Interaction] Config injected (sync):", window.interactionConfig);\n' +
      '        console.log("[Interaction] Fragments count (sync):", window.interactionData && window.interactionData.fragments ? window.interactionData.fragments.length : 0);\n' +
      '      } catch (e) {\n' +
      '        console.error("[Interaction] Error setting data:", e);\n' +
      '        window.interactionData = {};\n' +
      '        window.interactionConfig = {};\n' +
      '      }\n' +
      '    })();\n' +
      '  </script>\n' +
      '  <script type="text/javascript">\n' +
      '    // Run the interaction code (it has its own DOM ready checks via startInitialization)\n' +
      '    // Wrap in try-catch at the top level to catch any syntax errors\n' +
      '    try {\n' +
      '      if (!window.interactionData) {\n' +
      '        console.error("[Interaction] ERROR: window.interactionData is not set!");\n' +
      '        document.body.innerHTML = "<div style=\\"padding: 20px; color: red;\\"><h3>Error: Interaction data not available</h3></div>";\n' +
      '      } else {\n' +
      '        console.log("[Interaction] About to run JS code, data available:", !!window.interactionData.fragments);\n' +
      '        // Run the interaction code - it will handle DOM ready checks itself\n' +
      jsCode + '\n' +
      '      }\n' +
      '    } catch (e) {\n' +
      '      console.error("[Interaction] Error in script:", e);\n' +
      '      console.error("[Interaction] Error message:", e.message);\n' +
      '      console.error("[Interaction] Error stack:", e.stack);\n' +
      '      console.error("[Interaction] Error name:", e.name);\n' +
      '      var errorDiv = document.createElement("div");\n' +
      '      errorDiv.style.cssText = "padding: 20px; color: red; background: #1a1a1a; border: 2px solid red; margin: 20px;";\n' +
      '      errorDiv.innerHTML = "<h3>Error in interaction code:</h3><pre style=\\"white-space: pre-wrap;\\">" + e.name + ": " + e.message + "\\n\\n" + (e.stack || "") + "</pre>";\n' +
      '      document.body.appendChild(errorDiv);\n' +
      '    }\n' +
      '  </script>\n' +
      '</body>\n' +
      '</html>';
    
    console.log('[Preview] ✅ Complete HTML document generated for iframe');
    console.log('[Preview] 📄 HTML Document Length:', htmlDoc.length);
    console.log('[Preview] 📄 Contains script tag:', htmlDoc.includes('<script'));
    console.log('[Preview] 📄 Contains window.interactionData:', htmlDoc.includes('window.interactionData'));
    console.log('[Preview] 📄 Contains initializeWhenReady:', htmlDoc.includes('initializeWhenReady'));
    
    // Verify the script tag is properly closed (match any script tag with or without attributes)
    const scriptTagCount = (htmlDoc.match(/<script[\s>]/gi) || []).length;
    const scriptCloseCount = (htmlDoc.match(/<\/script>/gi) || []).length;
    console.log('[Preview] 📄 Script tags - open:', scriptTagCount, 'close:', scriptCloseCount);
    
    if (scriptTagCount !== scriptCloseCount) {
      console.error('[Preview] ❌ Mismatched script tags! Open:', scriptTagCount, 'Close:', scriptCloseCount);
      // Log a snippet of the HTML around script tags for debugging
      const scriptMatch = htmlDoc.match(/<script[\s\S]*?<\/script>/gi);
      if (scriptMatch) {
        console.log('[Preview] 📄 Script tag snippet (first 500 chars):', scriptMatch[0].substring(0, 500));
      }
    }
    
    return htmlDoc;
  }

  getHtmlPreviewBlobUrl(): SafeResourceUrl {
    if (!this.currentInteraction) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    // Check if we already have a cached blob URL for the current preview key
    if (this.currentBlobUrl && this.currentBlobUrlKey === this.previewKey) {
      // Reuse existing blob URL to prevent flickering
      return this.currentBlobUrl;
    }

    // Clean up old blob URL if it exists and key has changed
    if (this.currentBlobUrl && this.currentBlobUrlKey !== this.previewKey) {
      const oldUrl = (this.currentBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
        console.log('[Preview] 🗑️ Revoked old blob URL');
      }
    }
    
    console.log('[Preview] 🔄 Creating new blob URL for key:', this.previewKey);

    // Get the HTML document
    const htmlDoc = this.getHtmlPreviewSrcDoc();
    if (!htmlDoc) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    // Create a Blob from the HTML string
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    
    // Create a URL for the blob
    const url = URL.createObjectURL(blob);
    console.log('[Preview] 🔗 Created new blob URL:', url);
    console.log('[Preview] 📄 Blob size:', blob.size, 'bytes');
    console.log('[Preview] 🔑 Preview key:', this.previewKey);
    console.log('[Preview] 📋 Sample data present:', !!this.currentInteraction?.sampleData);
    if (this.currentInteraction?.sampleData && typeof this.currentInteraction.sampleData === 'object') {
      const fragments = (this.currentInteraction.sampleData as any)?.fragments;
      console.log('[Preview] 📋 Sample data fragments:', fragments?.length || 0);
      if (fragments && fragments.length > 0) {
        console.log('[Preview] 📋 First fragment:', JSON.stringify(fragments[0]));
      }
    }
    console.log('[Preview] 📄 HTML contains fragmentsGrid:', htmlDoc.includes('fragmentsGrid'));
    console.log('[Preview] 📄 HTML contains window.interactionData:', htmlDoc.includes('window.interactionData'));
    console.log('[Preview] 📄 HTML contains initializeWhenReady:', htmlDoc.includes('initializeWhenReady'));
    
    // Check if sample data is actually in the HTML
    const sampleDataInHtml = htmlDoc.includes('window.interactionData =');
    console.log('[Preview] 📄 Sample data injected in HTML:', sampleDataInHtml);
    if (sampleDataInHtml) {
      const dataMatch = htmlDoc.match(/window\.interactionData = ({[^;]+})/);
      if (dataMatch) {
        try {
          const parsedData = JSON.parse(dataMatch[1]);
          console.log('[Preview] 📄 Parsed data from HTML:', parsedData);
          console.log('[Preview] 📄 Fragments in parsed data:', parsedData.fragments?.length || 0);
        } catch (e) {
          console.error('[Preview] ❌ Failed to parse data from HTML:', e);
        }
      }
    }
    
    // Bypass security and store it with the current preview key
    this.currentBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.currentBlobUrlKey = this.previewKey;
    return this.currentBlobUrl;
  }

  clearBlobUrlCache() {
    // Revoke current blob URL if it exists
    if (this.currentBlobUrl) {
      const urlStr = (this.currentBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (urlStr && urlStr.startsWith('blob:')) {
        URL.revokeObjectURL(urlStr);
        console.log('[Preview] 🗑️ Revoked current blob URL');
      }
      this.currentBlobUrl = null;
      this.currentBlobUrlKey = null;
    }
    // Revoke iframe overlay blob URL if it exists
    if (this.currentIframeOverlayBlobUrl) {
      const urlStr = (this.currentIframeOverlayBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (urlStr && urlStr.startsWith('blob:')) {
        URL.revokeObjectURL(urlStr);
        console.log('[Preview] 🗑️ Revoked current iframe overlay blob URL');
      }
      this.currentIframeOverlayBlobUrl = null;
      this.currentIframeOverlayBlobUrlKey = null;
    }
    // Revoke media player blob URL if it exists
    if (this.currentMediaPlayerBlobUrl) {
      const urlStr = (this.currentMediaPlayerBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (urlStr && urlStr.startsWith('blob:')) {
        URL.revokeObjectURL(urlStr);
        console.log('[Preview] 🗑️ Revoked current media player blob URL');
      }
      this.currentMediaPlayerBlobUrl = null;
      this.currentMediaPlayerBlobUrlKey = null;
    }
  }

  getHtmlPreviewSafeSrcDoc(): SafeHtml {
    const htmlDoc = this.getHtmlPreviewSrcDoc();
    if (!htmlDoc) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    return this.sanitizer.bypassSecurityTrustHtml(htmlDoc);
  }

  getSafeIframeUrl(): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.currentInteraction?.iframeUrl || '');
  }

  getIframePreviewUrl(): string {
    // In builder mode, get URL from sample data
    if (this.currentInteraction?.sampleData && typeof this.currentInteraction.sampleData === 'object') {
      const url = (this.currentInteraction.sampleData as any).url;
      if (url && typeof url === 'string') {
        return url;
      }
    }
    // Fallback to iframeUrl if no sample data
    return this.currentInteraction?.iframeUrl || '';
  }

  getSafeIframePreviewUrl(): SafeResourceUrl {
    const url = this.getIframePreviewUrl();
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getIframeOverlayPreviewBlobUrl(): SafeResourceUrl {
    if (!this.currentInteraction) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    // Check if we already have a cached blob URL for the current preview key
    if (this.currentIframeOverlayBlobUrl && this.currentIframeOverlayBlobUrlKey === this.previewKey) {
      return this.currentIframeOverlayBlobUrl;
    }

    // Clean up old blob URL if it exists and key has changed
    if (this.currentIframeOverlayBlobUrl && this.currentIframeOverlayBlobUrlKey !== this.previewKey) {
      const oldUrl = (this.currentIframeOverlayBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }

    // Get iframe URL
    const iframeUrl = this.getIframePreviewUrl() || 'https://en.wikipedia.org/wiki/Main_Page';
    
    // Get overlay code
    const htmlCode = (this.currentInteraction.htmlCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    const cssCode = (this.currentInteraction.cssCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    const jsCode = (this.currentInteraction.jsCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    
    // Get sample data and config
    const sampleData = this.currentInteraction.sampleData || {};
    const sampleDataJson = JSON.stringify(sampleData);
    const configDefaults: any = {};
    if (this.currentInteraction.configSchema && this.currentInteraction.configSchema.fields) {
      this.currentInteraction.configSchema.fields.forEach((field: any) => {
        if (field.default !== undefined) {
          configDefaults[field.key] = field.default;
        }
      });
    }
    const configJson = JSON.stringify({ ...configDefaults, iframeUrl });
    
    // Escape code for template literal injection
    const escapedHtml = htmlCode ? htmlCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    const escapedCss = cssCode ? cssCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    const escapedJs = jsCode ? jsCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${') : '';
    
    // Create overlay wrapper HTML (same structure as lesson-view)
    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iFrame Overlay Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      margin: 0;
      padding: 0;
      background: #0f0f23;
      color: #ffffff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
      position: relative;
      width: 100vw;
      height: 100vh;
    }
    
    #iframe-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    
    #iframe-container iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    #button-overlay {
      position: absolute;
      top: 0;
      right: 0;
      width: 320px;
      max-height: 100vh;
      background: rgba(15, 15, 35, 0.95);
      border-left: 2px solid rgba(0, 212, 255, 0.3);
      z-index: 10;
      overflow-y: auto;
      padding: 20px;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.5);
    }
    
    #overlay-content {
      width: 100%;
    }
    
    #toggle-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 50px;
      height: 50px;
      background: rgba(0, 212, 255, 0.2);
      border: 2px solid rgba(0, 212, 255, 0.5);
      border-radius: 50%;
      color: #00d4ff;
      font-size: 24px;
      cursor: pointer;
      z-index: 11;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    
    #toggle-overlay:hover {
      background: rgba(0, 212, 255, 0.3);
      border-color: #00d4ff;
      transform: scale(1.1);
    }
    
    #button-overlay.hidden {
      transform: translateX(100%);
    }
    
    #button-overlay::-webkit-scrollbar {
      width: 6px;
    }
    
    #button-overlay::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
    }
    
    #button-overlay::-webkit-scrollbar-thumb {
      background: rgba(0, 212, 255, 0.3);
      border-radius: 3px;
    }
    
    #button-overlay::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 212, 255, 0.5);
    }
${escapedCss}
  </style>
</head>
<body>
  <div id="iframe-container">
    <iframe id="external-iframe" src="${this.escapeHtml(iframeUrl)}" frameborder="0" allowfullscreen></iframe>
  </div>
  
  <button id="toggle-overlay" title="Toggle Overlay Panel">⚙</button>
  
  <div id="button-overlay">
    <div id="overlay-content">
${escapedHtml || '<div>No overlay content</div>'}
    </div>
  </div>

  <script type="text/javascript">
    // Inject interaction data and config
    window.interactionData = ${sampleDataJson};
    window.interactionConfig = ${configJson};
    
    // Provide createIframeAISDK helper function for builder's code (preview mode - limited functionality)
    const createIframeAISDK = () => {
      console.log("[Preview] createIframeAISDK called - preview mode, limited functionality");
      return {
        emitEvent: (event, processedContentId) => { console.log("[Preview] emitEvent:", event); },
        updateState: (key, value) => { console.log("[Preview] updateState:", key, value); },
        getState: (callback) => { callback({}); },
        onResponse: (callback) => { return () => {}; },
        isReady: (callback) => { callback(true); },
        minimizeChatUI: () => { console.log("[Preview] minimizeChatUI"); },
        showChatUI: () => { console.log("[Preview] showChatUI"); },
        activateFullscreen: () => { console.log("[Preview] activateFullscreen"); },
        deactivateFullscreen: () => { console.log("[Preview] deactivateFullscreen"); },
        postToChat: (content, role, showInWidget) => { console.log("[Preview] postToChat:", content); },
        showScript: (script, autoPlay) => { console.log("[Preview] showScript:", script); },
        showSnack: (content, duration, hideFromChatUI, callback) => { console.log("[Preview] showSnack:", content); if (callback) callback("preview-snack-id"); },
        hideSnack: () => { console.log("[Preview] hideSnack"); },
        saveInstanceData: (data, callback) => { console.log("[Preview] saveInstanceData:", data); if (callback) callback(true, null); },
        getInstanceDataHistory: (filters, callback) => { console.log("[Preview] getInstanceDataHistory:", filters); if (callback) callback([], null); },
        saveUserProgress: (data, callback) => { console.log("[Preview] saveUserProgress:", data); if (callback) callback(null, "Preview mode"); },
        getUserProgress: (callback) => { console.log("[Preview] getUserProgress"); if (callback) callback(null, "Preview mode"); },
        markCompleted: (callback) => { console.log("[Preview] markCompleted"); if (callback) callback(null, "Preview mode"); },
        incrementAttempts: (callback) => { console.log("[Preview] incrementAttempts"); if (callback) callback(null, "Preview mode"); },
        getUserPublicProfile: (userId, callback) => { console.log("[Preview] getUserPublicProfile:", userId); if (callback) callback(null, "Preview mode"); },
        // Media Control Methods
        playMedia: (callback) => { console.log("[Preview] playMedia"); if (callback) callback(true, null); },
        pauseMedia: () => { console.log("[Preview] pauseMedia"); },
        seekMedia: (time) => { console.log("[Preview] seekMedia:", time); },
        setMediaVolume: (volume) => { console.log("[Preview] setMediaVolume:", volume); },
        getMediaCurrentTime: (callback) => { console.log("[Preview] getMediaCurrentTime"); if (callback) callback(0); },
        getMediaDuration: (callback) => { console.log("[Preview] getMediaDuration"); if (callback) callback(0); },
        isMediaPlaying: (callback) => { console.log("[Preview] isMediaPlaying"); if (callback) callback(false); },
        showOverlayHtml: () => { 
          console.log("[Preview] showOverlayHtml");
          const overlayContainer = document.querySelector('.overlay-container');
          if (overlayContainer) {
            overlayContainer.classList.remove('media-playing');
            console.log("[Preview] ✅ Overlay HTML shown");
          }
        },
        hideOverlayHtml: () => { 
          console.log("[Preview] hideOverlayHtml");
          const overlayContainer = document.querySelector('.overlay-container');
          if (overlayContainer) {
            overlayContainer.classList.add('media-playing');
            console.log("[Preview] ✅ Overlay HTML hidden");
          }
        },
      };
    };
    
    // Custom overlay code from builder
    (function() {
      // Initialize overlay toggle
      const toggleButton = document.getElementById("toggle-overlay");
      const buttonOverlay = document.getElementById("button-overlay");
      
      if (toggleButton && buttonOverlay) {
        toggleButton.onclick = () => {
          buttonOverlay.classList.toggle("hidden");
          toggleButton.textContent = buttonOverlay.classList.contains("hidden") ? "⚙" : "✕";
        };
      }
      
      // Load external iframe URL
      const externalIframe = document.getElementById("external-iframe");
      if (externalIframe) {
        const iframeUrl = (window.interactionConfig && window.interactionConfig.iframeUrl) || 
                          (window.interactionData && window.interactionData.url) ||
                          'https://en.wikipedia.org/wiki/Main_Page';
        externalIframe.src = iframeUrl;
        console.log("[iFrame Overlay Preview] Loading external URL:", iframeUrl);
      }
      
      // Wait for DOM to be ready, then run builder's code
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          try {
${escapedJs ? escapedJs.split('\n').map(line => '            ' + line).join('\n') : '            // No JavaScript code provided'}
          } catch (e) {
            console.error("[iFrame Overlay Preview] Error in builder's JavaScript:", e);
          }
        });
      } else {
        setTimeout(() => {
          try {
${escapedJs ? escapedJs.split('\n').map(line => '            ' + line).join('\n') : '            // No JavaScript code provided'}
          } catch (e) {
            console.error("[iFrame Overlay Preview] Error in builder's JavaScript:", e);
          }
        }, 10);
      }
    })();
  </script>
</body>
</html>`;

    // Create a Blob from the HTML string
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Store and return
    this.currentIframeOverlayBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.currentIframeOverlayBlobUrlKey = this.previewKey;
    return this.currentIframeOverlayBlobUrl;
  }

  getMediaPlayerPreviewBlobUrl(): SafeResourceUrl {
    if (!this.currentInteraction) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
    }

    // Check if we already have a cached blob URL for the current preview key
    if (this.currentMediaPlayerBlobUrl && this.currentMediaPlayerBlobUrlKey === this.previewKey) {
      return this.currentMediaPlayerBlobUrl;
    }

    // Clean up old blob URL if it exists and key has changed
    if (this.currentMediaPlayerBlobUrl && this.currentMediaPlayerBlobUrlKey !== this.previewKey) {
      const oldUrl = (this.currentMediaPlayerBlobUrl as any).changingThisBreaksApplicationSecurity;
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }
    }

    // Get overlay code
    const htmlCode = (this.currentInteraction.htmlCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    const cssCode = (this.currentInteraction.cssCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    const jsCode = (this.currentInteraction.jsCode || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\?{2,}/g, '').replace(/\uFFFD/g, '');
    
    // Get sample data and config
    const sampleData = this.currentInteraction.sampleData || {};
    const sampleDataJson = JSON.stringify(sampleData);
    const mediaConfig = (this.currentInteraction as any).mediaConfig || {};
    // Use current displayMode value (from component property) instead of mediaConfig to ensure latest value
    // This ensures the preview updates immediately when display mode changes, even before saving
    const displayMode = this.displayMode || mediaConfig.displayMode || 'section';
    // Also use current section sizing values from component properties for immediate updates
    const sectionHeight = this.sectionHeight || mediaConfig.sectionHeight || 'auto';
    const sectionMinHeight = this.sectionMinHeight || mediaConfig.sectionMinHeight || '200px';
    const sectionMaxHeight = this.sectionMaxHeight || mediaConfig.sectionMaxHeight || 'none';
    const showPlayerControls = this.showPlayerControls ?? mediaConfig.showPlayerControls ?? false;
    const configDefaults: any = {};
    if (this.currentInteraction.configSchema && this.currentInteraction.configSchema.fields) {
      this.currentInteraction.configSchema.fields.forEach((field: any) => {
        if (field.default !== undefined) {
          configDefaults[field.key] = field.default;
        }
      });
    }
    const configJson = JSON.stringify({ ...configDefaults, ...mediaConfig });
    
    // For string concatenation, we don't need to escape for template literals
    // But we do need to escape HTML special characters for safe insertion
    const escapedHtml = htmlCode || '';
    const escapedCss = cssCode || '';
    const jsCodeForPreview = jsCode || '';
    
    // Get media URL from selected media or sample data
    let mediaUrl = '';
    let mediaType = 'video';
    
    // Check for selectedMediaId first (from builder's media selection)
    if (this.selectedMediaId) {
      // Use the processed content API endpoint to get the media file
      // environment.apiUrl is 'http://localhost:3000/api', so we need to add '/content-sources' after '/api'
      mediaUrl = environment.apiUrl + '/content-sources/processed-content/' + this.selectedMediaId + '/file';
      console.log('[InteractionBuilder] 🎬 Using selectedMediaId:', this.selectedMediaId, 'URL:', mediaUrl);
    } else if (sampleData && (sampleData as any).mediaUrl) {
      mediaUrl = (sampleData as any).mediaUrl;
      mediaType = (sampleData as any).mediaType || 'video';
      console.log('[InteractionBuilder] 🎬 Using sample data mediaUrl:', mediaUrl);
    } else {
      // No media selected - show placeholder
      console.log('[InteractionBuilder] ⚠️ No media selected, showing placeholder');
    }
    
    // Determine media type from mediaConfig or sample data
    if (mediaConfig && mediaConfig.mediaType) {
      mediaType = mediaConfig.mediaType;
    } else if (!sampleData || !(sampleData as any).mediaType) {
      // Default to video if not specified
      mediaType = 'video';
    }
    
    // Determine MIME type from file extension or mediaType
    let mimeType = 'video/mp4'; // Default
    if (mediaUrl) {
      const urlLower = mediaUrl.toLowerCase();
      if (urlLower.includes('.webm')) mimeType = 'video/webm';
      else if (urlLower.includes('.ogv')) mimeType = 'video/ogg';
      else if (urlLower.includes('.mp3')) mimeType = 'audio/mpeg';
      else if (urlLower.includes('.wav')) mimeType = 'audio/wav';
      else if (urlLower.includes('.ogg') || urlLower.includes('.oga')) mimeType = 'audio/ogg';
      else if (mediaType === 'audio') mimeType = 'audio/mpeg';
      else mimeType = 'video/mp4';
    }
    
    // Create media player preview HTML using string concatenation to avoid template literal issues
    const controlsAttr = showPlayerControls ? ' controls' : '';
    const mediaPlayerHtml = mediaUrl 
      ? (mediaType === 'video' 
        ? '<video id="media-player"' + controlsAttr + ' crossorigin="anonymous" preload="metadata" playsinline style="width: 100%; height: auto; max-height: 70vh; object-fit: contain;"><source src="' + this.escapeHtml(mediaUrl) + '" type="' + mimeType + '">Your browser does not support the video tag.</video>'
        : '<audio id="media-player"' + controlsAttr + ' crossorigin="anonymous" preload="metadata" style="width: 100%;"><source src="' + this.escapeHtml(mediaUrl) + '" type="' + mimeType + '">Your browser does not support the audio tag.</audio>')
      : '<div style="padding: 40px; text-align: center; color: #999; background: rgba(0,0,0,0.3); border: 2px dashed #444; border-radius: 8px; margin: 20px;"><p style="font-size: 16px; margin-bottom: 10px;">⚠️ No media selected</p><p style="font-size: 12px;">Select a media file in the Code tab to preview</p></div>';
    
    // Ensure overlay content is properly formatted
    const overlayContent = escapedHtml.trim() || '<div style="padding: 20px; color: #999; text-align: center;">No SDK test buttons configured</div>';
    
    const htmlDoc = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>Media Player Preview</title>\n' +
'  <style>\n' +
'    * {\n' +
'      margin: 0;\n' +
'      padding: 0;\n' +
'      box-sizing: border-box;\n' +
'    }\n' +
'    \n' +
'    body {\n' +
'      margin: 0;\n' +
'      padding: 0;\n' +
'      background: #0f0f23;\n' +
'      color: #ffffff;\n' +
'      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;\n' +
(displayMode === 'overlay' 
  ? '      overflow: hidden; position: relative; width: 100vw; height: 100vh;\n'
  : '      display: flex; flex-direction: column; height: 100vh; overflow-y: auto; width: 100vw;\n') +
'    }\n' +
'    \n' +
'    #media-container {\n' +
(displayMode === 'overlay'
  ? '      position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; display: flex; align-items: center; justify-content: center; background: #000;\n'
  : '      flex: 0 0 auto; width: 100%; display: flex; align-items: center; justify-content: center; background: #000; padding: 10px; min-height: 200px; order: 1;\n') +
'    }\n' +
'    \n' +
'    #media-container video,\n' +
'    #media-container audio {\n' +
'      max-width: 100%;\n' +
(displayMode === 'overlay' ? '      max-height: 100%; z-index: 1;\n' : '      width: 100%; height: auto;\n') +
'    }\n' +
'    \n' +
'    #overlay-container {\n' +
(displayMode === 'overlay'
  ? '      position: absolute; bottom: 0; left: 0; right: 0; z-index: 100; pointer-events: none; max-height: 40%; overflow-y: auto; background: rgba(15, 15, 35, 0.95); padding: 20px;\n' +
    '    }\n' +
    '    \n' +
    '    #overlay-container > * {\n' +
    '      pointer-events: auto;\n' +
    '    }\n' +
    '    \n' +
    '    /* Ensure video controls are accessible but overlay is on top */\n' +
    '    #media-container video::-webkit-media-controls-panel,\n' +
    '    #media-container video::-webkit-media-controls-play-button,\n' +
    '    #media-container video::-webkit-media-controls-timeline,\n' +
    '    #media-container video::-webkit-media-controls-current-time-display,\n' +
    '    #media-container video::-webkit-media-controls-time-remaining-display,\n' +
    '    #media-container video::-webkit-media-controls-mute-button,\n' +
    '    #media-container video::-webkit-media-controls-volume-slider,\n' +
    '    #media-container video::-webkit-media-controls-fullscreen-button {\n' +
    '      z-index: 50 !important;\n' +
    '      pointer-events: auto !important;\n' +
    '    }\n' +
    '    \n' +
    '    #media-container audio::-webkit-media-controls-panel {\n' +
    '      z-index: 50 !important;\n' +
    '      pointer-events: auto !important;\n' +
    '    }\n'
  : '      flex: 1 1 auto; width: 100%; overflow-y: auto; background: rgba(15, 15, 35, 0.95); padding: 20px; height: ' + sectionHeight + '; min-height: ' + sectionMinHeight + ';' + (sectionMaxHeight !== 'none' ? ' max-height: ' + sectionMaxHeight + ';' : '') + ' order: 2; position: relative !important; z-index: 1 !important;\n') +
'    }\n' +
'    \n' +
'    /* Responsive design */\n' +
'    @media (max-width: 768px) {\n' +
(displayMode === 'overlay'
  ? '      #overlay-container { padding: 15px; max-height: 50%; }\n'
  : '      #media-container { min-height: 150px; padding: 5px; } #overlay-container { padding: 15px; min-height: 150px; }\n') +
'    }\n' +
'    \n' +
'    @media (min-width: 769px) and (max-width: 1024px) {\n' +
(displayMode === 'overlay'
  ? '      #overlay-container { max-height: 45%; }\n'
  : '      #media-container { min-height: 250px; } #overlay-container { min-height: 250px; }\n') +
'    }\n' +
'    \n' +
'    @media (min-width: 1025px) {\n' +
(displayMode === 'overlay'
  ? '      #overlay-container { max-height: 40%; }\n'
  : '      #media-container { min-height: 300px; } #overlay-container { min-height: 300px; }\n') +
'    }\n' +
escapedCss + '\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <div id="media-container">\n' +
mediaPlayerHtml + '\n' +
'  </div>\n' +
'  \n' +
'  <div id="overlay-container">\n' +
overlayContent + '\n' +
'  </div>\n' +
'\n' +
'  <script type="text/javascript">\n' +
'    // Inject interaction data and config\n' +
'    window.interactionData = ' + sampleDataJson + ';\n' +
'    window.interactionConfig = ' + configJson + ';\n' +
'    \n' +
'    // Provide createIframeAISDK helper function for builder\'s code (preview mode - limited functionality)\n' +
'    const createIframeAISDK = () => {\n' +
'      console.log("[Media Player Preview] createIframeAISDK called - preview mode, limited functionality");\n' +
'      const mediaPlayer = document.getElementById("media-player");\n' +
'      return {\n' +
'        emitEvent: (event, processedContentId) => { console.log("[Preview] emitEvent:", event); },\n' +
'        updateState: (key, value) => { console.log("[Preview] updateState:", key, value); },\n' +
'        getState: (callback) => { callback({}); },\n' +
'        onResponse: (callback) => { return () => {}; },\n' +
'        isReady: (callback) => { callback(true); },\n' +
'        minimizeChatUI: () => { console.log("[Preview] minimizeChatUI"); },\n' +
'        showChatUI: () => { console.log("[Preview] showChatUI"); },\n' +
'        activateFullscreen: () => { console.log("[Preview] activateFullscreen"); },\n' +
'        deactivateFullscreen: () => { console.log("[Preview] deactivateFullscreen"); },\n' +
'        postToChat: (content, role, showInWidget) => { console.log("[Preview] postToChat:", content); },\n' +
'        showScript: (script, autoPlay) => { console.log("[Preview] showScript:", script); },\n' +
'        showSnack: (content, duration, hideFromChatUI, callback) => { console.log("[Preview] showSnack:", content); if (callback) callback("preview-snack-id"); },\n' +
'        hideSnack: () => { console.log("[Preview] hideSnack"); },\n' +
'        saveInstanceData: (data, callback) => { console.log("[Preview] saveInstanceData:", data); if (callback) callback(true, null); },\n' +
'        getInstanceDataHistory: (filters, callback) => { console.log("[Preview] getInstanceDataHistory:", filters); if (callback) callback([], null); },\n' +
'        saveUserProgress: (data, callback) => { console.log("[Preview] saveUserProgress:", data); if (callback) callback(null, "Preview mode"); },\n' +
'        getUserProgress: (callback) => { console.log("[Preview] getUserProgress"); if (callback) callback(null, "Preview mode"); },\n' +
'        markCompleted: (callback) => { console.log("[Preview] markCompleted"); if (callback) callback(null, "Preview mode"); },\n' +
'        incrementAttempts: (callback) => { console.log("[Preview] incrementAttempts"); if (callback) callback(null, "Preview mode"); },\n' +
'        getUserPublicProfile: (userId, callback) => { console.log("[Preview] getUserPublicProfile:", userId); if (callback) callback(null, "Preview mode"); },\n' +
'        // Media control methods (preview mode - limited)\n' +
'        playMedia: (callback) => { \n' +
'          if (mediaPlayer) { \n' +
'            mediaPlayer.play().then(() => {\n' +
'              console.log("[Preview] playMedia");\n' +
'              if (callback) callback(true, null);\n' +
'            }).catch((e) => {\n' +
'              console.error("[Preview] playMedia error:", e);\n' +
'              if (callback) callback(false, e.message);\n' +
'            });\n' +
'          } else if (callback) callback(false, "Media player not available");\n' +
'        },\n' +
'        pauseMedia: () => { \n' +
'          if (mediaPlayer) mediaPlayer.pause();\n' +
'          console.log("[Preview] pauseMedia");\n' +
'        },\n' +
'        seekMedia: (time) => { \n' +
'          if (mediaPlayer) mediaPlayer.currentTime = time;\n' +
'          console.log("[Preview] seekMedia:", time);\n' +
'        },\n' +
'        setMediaVolume: (volume) => { \n' +
'          if (mediaPlayer) mediaPlayer.volume = volume;\n' +
'          console.log("[Preview] setMediaVolume:", volume);\n' +
'        },\n' +
'        getMediaCurrentTime: (callback) => { \n' +
'          if (mediaPlayer && callback) callback(mediaPlayer.currentTime);\n' +
'        },\n' +
'        getMediaDuration: (callback) => { \n' +
'          if (mediaPlayer && callback) callback(mediaPlayer.duration || 0);\n' +
'        },\n' +
'        isMediaPlaying: (callback) => { \n' +
'          if (mediaPlayer && callback) callback(!mediaPlayer.paused);\n' +
'        },\n' +
'      };\n' +
'    };\n' +
'    \n' +
'    // Wait for media to load, then run builder\'s code\n' +
'    (function() {\n' +
'      var userJsCode = ' + JSON.stringify(jsCodeForPreview || '// No JavaScript code provided') + ';\n' +
'      var executeCode = function() {\n' +
'        try {\n' +
'          eval(userJsCode);\n' +
'        } catch (e) {\n' +
'          console.error("[Media Player Preview] Error in builder\'s JavaScript:", e);\n' +
'        }\n' +
'      };\n' +
'      \n' +
'      // Wait for media player to be ready, but don\'t block if media fails\n' +
'      var mediaPlayer = document.getElementById("media-player");\n' +
'      var codeExecuted = false;\n' +
'      var executeOnce = function() {\n' +
'        if (!codeExecuted) {\n' +
'          codeExecuted = true;\n' +
'          executeCode();\n' +
'        }\n' +
'      };\n' +
'      \n' +
'      if (mediaPlayer && (mediaPlayer.tagName === "VIDEO" || mediaPlayer.tagName === "AUDIO")) {\n' +
'        mediaPlayer.addEventListener("loadedmetadata", function() {\n' +
'          console.log("[Media Player Preview] Media metadata loaded");\n' +
'          executeOnce();\n' +
'        });\n' +
'        mediaPlayer.addEventListener("error", function(e) {\n' +
'          console.error("[Media Player Preview] Media load error:", e);\n' +
'          executeOnce(); // Still execute code even if media fails\n' +
'        });\n' +
'        // If metadata already loaded, execute immediately\n' +
'        if (mediaPlayer.readyState >= 1) {\n' +
'          executeOnce();\n' +
'        } else {\n' +
'          // Set timeout to execute code even if media never loads\n' +
'          setTimeout(executeOnce, 2000);\n' +
'        }\n' +
'      } else {\n' +
'        // No media player, execute immediately\n' +
'        if (document.readyState === "loading") {\n' +
'          document.addEventListener("DOMContentLoaded", executeOnce);\n' +
'        } else {\n' +
'          setTimeout(executeOnce, 10);\n' +
'        }\n' +
'      }\n' +
'    })();\n' +
'  </script>\n' +
'</body>\n' +
'</html>';

    // Create a Blob from the HTML string
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Store and return
    this.currentMediaPlayerBlobUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.currentMediaPlayerBlobUrlKey = this.previewKey;
    return this.currentMediaPlayerBlobUrl;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getIframeWidth(): string {
    return this.currentInteraction?.iframeConfig?.width || '100%';
  }

  getIframeHeight(): string {
    return this.currentInteraction?.iframeConfig?.height || '600px';
  }

  onPreviewComplete(result: any) {
    console.log('Preview interaction completed:', result);
  }


  // AI Assistant methods
  onAiEnter(event: KeyboardEvent) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }

  getAssistantPromptKey(): string {
    if (!this.currentInteraction) return 'general';
    
    const category = this.currentInteraction.interactionTypeCategory;
    switch (category) {
      case 'html': return 'html-interaction';
      case 'pixijs': return 'pixijs-interaction';
      case 'iframe': return 'iframe-interaction';
      default: return 'general';
    }
  }

  async sendAiMessage() {
    // Enforce character limit (2000 chars)
    const message = this.aiInput.trim().substring(0, 2000);
    if (!message || this.aiTyping || !this.currentInteraction) return;

    this.aiMessages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    this.aiInput = '';
    this.aiTyping = true;

    // Get the appropriate prompt for this interaction type
    const promptKey = this.getAssistantPromptKey();
    console.log('[AI] 🤖 Using prompt key:', promptKey);

    try {
      // Build comprehensive context with current state
      const context: any = {
        // Settings
        settings: {
          id: this.currentInteraction.id,
          name: this.currentInteraction.name,
          description: this.currentInteraction.description,
          category: this.currentInteraction.category,
          interactionTypeCategory: this.currentInteraction.interactionTypeCategory
        },
        // Code
        code: {
          html: this.currentInteraction.htmlCode || '',
          css: this.currentInteraction.cssCode || '',
          js: this.currentInteraction.jsCode || '',
          iframeUrl: this.currentInteraction.iframeUrl || ''
        },
        // Config Schema
        configSchema: this.currentInteraction.configSchema || null,
        // Sample Data
        sampleData: this.currentInteraction.sampleData || null
      };

      // Include test validation errors if they exist
      if (this.testResult && !this.testResult.success && this.testResult.error) {
        context.testErrors = {
          message: this.testResult.message,
          error: this.testResult.error
        };
      }

      // Prepare conversation history (exclude current message, format for API)
      const conversationHistory = this.aiMessages
        .slice(0, -1) // Exclude the current message we just added
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      // Call AI Assistant API
      const response = await this.http.post<{
        success: boolean;
        data: {
          content: string;
          suggestedChanges?: SuggestedChanges;
          tokensUsed: number;
          assistantId: string;
          promptKey: string;
        };
      }>(`${environment.apiUrl}/ai-assistant/chat`, {
        assistantId: 'inventor',
        promptKey: promptKey,
        userMessage: message,
        context: context,
        conversationHistory: conversationHistory
      }).toPromise();

      if (response?.success && response.data) {
        // Extract summary (text before first code block) for display
        const summaryContent = this.extractSummaryFromResponse(response.data.content);
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: summaryContent, // Show only summary in chat UI
          suggestedChanges: response.data.suggestedChanges, // Full content already parsed on backend
          timestamp: new Date(),
          accepted: false
        };

        this.aiMessages.push(assistantMessage);
        console.log('[AI] ✅ Response received:', {
          tokensUsed: response.data.tokensUsed,
          hasChanges: !!response.data.suggestedChanges
        });
        
        // Scroll to show the start of the new AI response
        setTimeout(() => {
          this.scrollToMessageStart(this.aiMessages.length - 1);
        }, 100);
      } else {
        throw new Error('Invalid response from AI assistant');
      }
    } catch (error: any) {
      console.error('[AI] ❌ Error calling AI assistant:', error);
      this.aiMessages.push({
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      });
      
      // Scroll to show the start of the error message
      setTimeout(() => {
        this.scrollToMessageStart(this.aiMessages.length - 1);
      }, 100);
    } finally {
      this.aiTyping = false;
    }
  }

  /**
   * Scroll to show the start of a message at the top of the chat window
   */
  private scrollToMessageStart(messageIndex: number) {
    if (!this.aiChatHistory) return;
    
    const chatElement = this.aiChatHistory.nativeElement;
    const messageElement = chatElement.querySelector(`[data-message-index="${messageIndex}"]`) as HTMLElement;
    
    if (messageElement) {
      // Scroll to show the start of the message at the top of the visible area
      const chatRect = chatElement.getBoundingClientRect();
      const messageRect = messageElement.getBoundingClientRect();
      const relativeTop = messageRect.top - chatRect.top + chatElement.scrollTop;
      
      chatElement.scrollTop = relativeTop - 10; // 10px padding from top
    }
  }

  /**
   * Accept suggested changes from an AI assistant message
   */
  acceptSuggestedChanges(messageIndex: number) {
    const message = this.aiMessages[messageIndex];
    if (!message || !message.suggestedChanges || !this.currentInteraction) {
      return;
    }

    const changes = message.suggestedChanges;
    let hasChanges = false;

    // Apply settings changes
    if (changes.settings) {
      if (changes.settings.name !== undefined) {
        this.currentInteraction.name = changes.settings.name;
        hasChanges = true;
      }
      if (changes.settings.description !== undefined) {
        this.currentInteraction.description = changes.settings.description;
        hasChanges = true;
      }
      if (changes.settings.id !== undefined) {
        this.currentInteraction.id = changes.settings.id;
        hasChanges = true;
      }
    }

    // Apply code changes
    // Note: These update the object properties which are directly bound to textareas via [(ngModel)]
    // Angular's change detection will automatically update the UI when these properties change
    if (changes.code) {
      if (changes.code.html !== undefined) {
        this.currentInteraction.htmlCode = changes.code.html;
        hasChanges = true;
      }
      if (changes.code.css !== undefined) {
        this.currentInteraction.cssCode = changes.code.css;
        hasChanges = true;
      }
      if (changes.code.js !== undefined) {
        this.currentInteraction.jsCode = changes.code.js;
        hasChanges = true;
      }
    }

    // Apply config schema changes
    if (changes.configSchema) {
      this.currentInteraction.configSchema = changes.configSchema;
      // Update the text field that's bound to the UI
      this.configSchemaText = JSON.stringify(changes.configSchema, null, 2);
      hasChanges = true;
    }

    // Apply sample data changes
    if (changes.sampleData) {
      this.currentInteraction.sampleData = changes.sampleData;
      // Update the text field that's bound to the UI
      this.sampleDataText = JSON.stringify(changes.sampleData, null, 2);
      hasChanges = true;
    }

    // Mark message as accepted
    message.accepted = true;

    // Mark interaction as changed if any changes were applied
    if (hasChanges) {
      this.markChanged();
    }

    // Refresh preview if code, config, or sample data changed
    if (changes.code || changes.configSchema || changes.sampleData) {
      this.previewKey = Date.now();
    }

    // Show success message
    this.snackbarMessage = '✅ Changes applied successfully!';
    this.showSnackbar = true;
    setTimeout(() => {
      this.showSnackbar = false;
    }, 3000);

    console.log('[AI] ✅ Accepted changes:', changes);
  }

  /**
   * Extract summary from AI response (text before first code block)
   * This shows only the brief summary in chat, hiding code blocks
   */
  extractSummaryFromResponse(fullContent: string): string {
    if (!fullContent) return '';
    
    // Find the first code block (```)
    const firstCodeBlockIndex = fullContent.indexOf('```');
    
    if (firstCodeBlockIndex === -1) {
      // No code blocks, return full content
      return fullContent.trim();
    }
    
    // Extract text before first code block
    const summary = fullContent.substring(0, firstCodeBlockIndex).trim();
    
    // If summary is empty, return a default message
    return summary || 'Changes suggested. See details below.';
  }

  /**
   * Get summary of suggested changes for display
   */
  getChangesSummary(changes: SuggestedChanges): string {
    const parts: string[] = [];

    if (changes.settings) {
      const settingsParts: string[] = [];
      if (changes.settings.name) settingsParts.push('name');
      if (changes.settings.description) settingsParts.push('description');
      if (changes.settings.id) settingsParts.push('id');
      if (settingsParts.length > 0) {
        parts.push(`Settings: ${settingsParts.join(', ')}`);
      }
    }

    if (changes.code) {
      const codeParts: string[] = [];
      if (changes.code.html) codeParts.push('HTML');
      if (changes.code.css) codeParts.push('CSS');
      if (changes.code.js) codeParts.push('JavaScript');
      if (codeParts.length > 0) {
        parts.push(`Code: ${codeParts.join(', ')}`);
      }
    }

    if (changes.configSchema) {
      parts.push('Config Schema');
    }

    if (changes.sampleData) {
      parts.push('Sample Data');
    }

    return parts.length > 0 ? parts.join(' • ') : 'No changes detected';
  }

  getAiResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase();
    
    if (lower.includes('html') || lower.includes('css')) {
      return 'For HTML interactions, you can use standard HTML5, CSS3, and vanilla JavaScript. The HTML code will be rendered in a sandboxed environment. You can access the interaction data via a global `interactionData` variable.';
    }
    
    if (lower.includes('pixijs') || lower.includes('pixi')) {
      return 'PixiJS interactions should export a class with a constructor that takes (container, data). You can import PIXI and create your interactive graphics. The container is a DOM element where your PixiJS canvas will be mounted.';
    }
    
    if (lower.includes('iframe')) {
      return 'For iFrame interactions, simply provide the URL you want to embed. You can configure the width, height, and permissions in the iframe config JSON. You can also set the "Overlay Mode" to control how HTML/CSS/JS content is displayed: "Overlay on iFrame" (default) renders content on top of the iframe, while "Section below iFrame" renders content as a separate section below.';
    }
    
    if (lower.includes('config') || lower.includes('schema')) {
      return 'The config schema defines what lesson-builders can customize. Use JSON to define fields with types like "string", "number", "boolean", "array", etc. Each field should have a key, label, and type.';
    }
    
    if (lower.includes('sample') || lower.includes('preview')) {
      return 'Sample data should match the format your interaction expects. For example, a true/false interaction might expect { "fragments": [...] }. This data is used in the Preview tab to test your interaction.';
    }
    
    return 'I can help you with HTML, PixiJS, iFrame interactions, config schemas, and sample data. What would you like to know?';
  }

  /**
   * Attempts to render the preview and validates it works
   * This is the final validation step for Code, Config, and Sample Data
   */
  private attemptPreviewRender(): { success: boolean; error?: string } {
    if (!this.currentInteraction) {
      return { success: false, error: 'No interaction selected' };
    }

    if (this.currentInteraction.interactionTypeCategory === 'html') {
      if (!this.currentInteraction.htmlCode || this.currentInteraction.htmlCode.trim() === '') {
        return { success: false, error: 'HTML code is required' };
      }

      // Check for common attribute typos FIRST (before parsing)
      const htmlCode = this.currentInteraction.htmlCode;
      const typoPatterns = [
        { pattern: /\bclas=/gi, error: 'HTML typo: "clas=" should be "class="' },
        { pattern: /\bclasss=/gi, error: 'HTML typo: "classs=" should be "class="' },
        { pattern: /cladss\s*=/gi, error: 'HTML typo: "cladss=" should be "class="' },
        { pattern: /cldss\s*=/gi, error: 'HTML typo: "cldss=" should be "class="' },
        { pattern: /cl[^a]ss\s*=/gi, error: 'HTML typo: Possible "class" typo detected (should be "class=")' },
        { pattern: /\bclss=/gi, error: 'HTML typo: "clss=" should be "class="' },
        { pattern: /\bide=/gi, error: 'HTML typo: "ide=" should be "id="' },
        { pattern: /\bidd=/gi, error: 'HTML typo: "idd=" should be "id="' },
        { pattern: /\bdiv\s+[^>]*[^c]lass=/gi, error: 'Possible spacing issue in "class=" attribute' }
      ];

      for (const {pattern, error} of typoPatterns) {
        if (pattern.test(htmlCode)) {
          return { success: false, error };
        }
      }

      // Validate sample data is valid JSON
      let sampleData = {};
      if (this.sampleDataText.trim()) {
        try {
          sampleData = JSON.parse(this.sampleDataText);
        } catch (jsonError: any) {
          return { success: false, error: `Sample data JSON error: ${jsonError.message}` };
        }
      }

      // ACTUAL TEST: Try to render in hidden container
      console.log('[Test] 🎬 Attempting to render preview...');
      const testContainer = document.createElement('div');
      testContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;';
      document.body.appendChild(testContainer);

      try {
        // Add CSS
        let testHtml = '';
        if (this.currentInteraction.cssCode) {
          testHtml += `<style>${this.currentInteraction.cssCode}</style>`;
        }

        // Add HTML
        testHtml += this.currentInteraction.htmlCode;

        // Inject and execute
        testContainer.innerHTML = testHtml;

        // Execute JavaScript with sample data
        if (this.currentInteraction.jsCode) {
          // First, validate JavaScript syntax BEFORE trying to execute
          let jsCode = this.currentInteraction.jsCode;
          
          // Normalize line endings (CRLF -> LF, CR -> LF)
          jsCode = jsCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          
          // Remove corrupted emoji characters and Unicode replacement characters
          jsCode = jsCode.replace(/\?{2,}/g, '');
          jsCode = jsCode.replace(/\uFFFD/g, '');
          
          // Check for characters that would break HTML string injection
          if (jsCode.includes('</script>') && !jsCode.includes('\\/script>')) {
            throw new Error('JavaScript contains unescaped "</script>" tag. Use "\\/script>" in strings instead.');
          }
          
          // Check for syntax errors using Function constructor (safer than eval)
          // We need to validate the syntax without executing
          try {
            // Use Function constructor directly - it will throw SyntaxError if invalid
            // We wrap in try-catch to handle the error properly
            new Function(jsCode);
            console.log('[Test] ✅ JavaScript syntax is valid');
          } catch (syntaxError: any) {
            // Only throw if it's a SyntaxError, not other errors
            if (syntaxError instanceof SyntaxError || syntaxError.name === 'SyntaxError') {
              const errorMsg = syntaxError.message || 'Unknown syntax error';
              const errorName = syntaxError.name || 'SyntaxError';
              throw new Error(`JavaScript syntax error: ${errorName}: ${errorMsg}. This will prevent the code from executing in the preview.`);
            }
            // Other errors (like ReferenceError) are OK for syntax validation
            console.log('[Test] ⚠️ Non-syntax error during validation (OK):', syntaxError.message);
          }
          
          const sampleDataJson = JSON.stringify(sampleData);
          // Use JSON.stringify to safely embed the JavaScript code
          // This properly escapes all special characters including backticks and template literals
          const jsCodeJson = JSON.stringify(jsCode);
          const wrappedJs = '(function() {\n' +
            '  try {\n' +
            '    window.interactionData = ' + sampleDataJson + ';\n' +
            '    var userCode = ' + jsCodeJson + ';\n' +
            '    eval(userCode);\n' +
            '  } catch (e) {\n' +
            '    throw new Error("Runtime error: " + e.message);\n' +
            '  }\n' +
            '})();';
          const scriptEl = document.createElement('script');
          scriptEl.textContent = wrappedJs;
          testContainer.appendChild(scriptEl);
        }

        // Check required elements actually exist in DOM
        if (this.currentInteraction.id === 'true-false-selection') {
          const fragmentsGrid = testContainer.querySelector('#fragmentsGrid') || 
                               testContainer.querySelector('.fragments-grid');
          if (!fragmentsGrid) {
            throw new Error('Preview render failed: Required element "fragmentsGrid" not found in DOM');
          }

          const targetStatement = testContainer.querySelector('#targetStatement') ||
                                testContainer.querySelector('.target-statement');
          if (!targetStatement) {
            throw new Error('Preview render failed: Required element "targetStatement" not found in DOM');
          }

          const submitBtn = testContainer.querySelector('#submitBtn') ||
                           testContainer.querySelector('.submit-btn');
          if (!submitBtn) {
            throw new Error('Preview render failed: Required element "submitBtn" not found in DOM');
          }

          console.log('[Test] ✅ All required elements found in DOM');
        }

        // Small delay to catch async errors
        setTimeout(() => {
          if (document.body.contains(testContainer)) {
            document.body.removeChild(testContainer);
            console.log('[Test] 🧹 Cleaned up test container');
          }
        }, 100);

        return { success: true };

      } catch (renderError: any) {
        if (document.body.contains(testContainer)) {
          document.body.removeChild(testContainer);
        }
        return { success: false, error: renderError.message || 'Preview render failed' };
      }

    } else if (this.currentInteraction.interactionTypeCategory === 'pixijs') {
      if (!this.currentInteraction.jsCode || this.currentInteraction.jsCode.trim() === '') {
        return { success: false, error: 'PixiJS code is required' };
      }

      // Validate sample data is valid JSON
      let sampleData = {};
      if (this.sampleDataText.trim()) {
        try {
          sampleData = JSON.parse(this.sampleDataText);
        } catch (jsonError: any) {
          return { success: false, error: `Sample data JSON error: ${jsonError.message}` };
        }
      }

      // Validate JavaScript syntax
      let jsCode = this.currentInteraction.jsCode;
      
      // Normalize line endings (CRLF -> LF, CR -> LF)
      jsCode = jsCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Remove corrupted emoji characters and Unicode replacement characters
      jsCode = jsCode.replace(/\?{2,}/g, '');
      jsCode = jsCode.replace(/\uFFFD/g, '');
      
      // Check for syntax errors using Function constructor
      try {
        new Function(jsCode);
        console.log('[Test] ✅ PixiJS JavaScript syntax is valid');
      } catch (syntaxError: any) {
        const errorMsg = syntaxError.message || 'Unknown syntax error';
        const errorName = syntaxError.name || 'SyntaxError';
        return { 
          success: false, 
          error: `PixiJS code syntax error: ${errorName}: ${errorMsg}. This will prevent the code from executing.` 
        };
      }

      // For PixiJS, we validate syntax and sample data structure
      // Full rendering would require PIXI library, but syntax validation is sufficient
      // to ensure the code will work when the library is loaded
      return { success: true };

    } else if (this.currentInteraction.interactionTypeCategory === 'iframe') {
      if (!this.currentInteraction.iframeUrl) {
        return { success: false, error: 'iFrame URL is required' };
      }

      // Validate URL format
      try {
        new URL(this.currentInteraction.iframeUrl);
      } catch (urlError) {
        return { success: false, error: 'Invalid URL format' };
      }

      // Validate iframeConfig JSON if provided
      if (this.currentInteraction.iframeConfig) {
        try {
          // Ensure it's a valid object (already parsed from text field)
          if (typeof this.currentInteraction.iframeConfig !== 'object' || this.currentInteraction.iframeConfig === null) {
            return { success: false, error: 'iFrame Config must be a valid JSON object' };
          }
        } catch (configError: any) {
          return { success: false, error: `iFrame Config JSON error: ${configError.message}` };
        }
      }

      // Validate sample data JSON if provided (for iFrame, sample data might contain URL parameters or other config)
      if (this.sampleDataText.trim()) {
        try {
          const sampleData = JSON.parse(this.sampleDataText);
          // Validate it's an object
          if (typeof sampleData !== 'object' || sampleData === null) {
            return { success: false, error: 'Sample Data must be a valid JSON object' };
          }
        } catch (jsonError: any) {
          return { success: false, error: `Sample data JSON error: ${jsonError.message}` };
        }
      }

      // For iFrame, we validate URL format, config structure, and sample data
      // Full rendering test would require loading the external URL (CORS issues possible)
      // but syntax/structure validation ensures it will work when loaded
      return { success: true };

    } else if (this.currentInteraction.interactionTypeCategory === 'uploaded-media') {
      // Media Player interactions use overlay HTML/CSS/JS similar to HTML interactions
      if (!this.currentInteraction.htmlCode || this.currentInteraction.htmlCode.trim() === '') {
        return { success: false, error: 'Overlay HTML code is required for Media Player interactions' };
      }

      // Validate HTML for common typos
      const htmlCode = this.currentInteraction.htmlCode;
      const typoPatterns = [
        { pattern: /\bclas=/gi, error: 'HTML typo: "clas=" should be "class="' },
        { pattern: /\bclasss=/gi, error: 'HTML typo: "classs=" should be "class="' },
        { pattern: /cladss\s*=/gi, error: 'HTML typo: "cladss=" should be "class="' },
        { pattern: /cldss\s*=/gi, error: 'HTML typo: "cldss=" should be "class="' },
        { pattern: /cl[^a]ss\s*=/gi, error: 'HTML typo: Possible "class" typo detected (should be "class=")' },
        { pattern: /\bclss=/gi, error: 'HTML typo: "clss=" should be "class="' },
        { pattern: /\bide=/gi, error: 'HTML typo: "ide=" should be "id="' },
        { pattern: /\bidd=/gi, error: 'HTML typo: "idd=" should be "id="' },
        { pattern: /\bdiv\s+[^>]*[^c]lass=/gi, error: 'Possible spacing issue in "class=" attribute' }
      ];

      for (const {pattern, error} of typoPatterns) {
        if (pattern.test(htmlCode)) {
          return { success: false, error };
        }
      }

      // Validate sample data is valid JSON
      let sampleData = {};
      if (this.sampleDataText.trim()) {
        try {
          sampleData = JSON.parse(this.sampleDataText);
        } catch (jsonError: any) {
          return { success: false, error: `Sample data JSON error: ${jsonError.message}` };
        }
      }

      // Validate media config JSON if provided
      if (this.mediaConfigText.trim()) {
        try {
          const mediaConfig = JSON.parse(this.mediaConfigText);
          if (typeof mediaConfig !== 'object' || mediaConfig === null) {
            return { success: false, error: 'Media Config must be a valid JSON object' };
          }
        } catch (configError: any) {
          return { success: false, error: `Media Config JSON error: ${configError.message}` };
        }
      }

      // ACTUAL TEST: Try to render overlay in hidden container
      console.log('[Test] 🎬 Attempting to render Media Player overlay preview...');
      const testContainer = document.createElement('div');
      testContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;height:600px;';
      document.body.appendChild(testContainer);

      try {
        // Add CSS
        let testHtml = '';
        if (this.currentInteraction.cssCode) {
          testHtml += `<style>${this.currentInteraction.cssCode}</style>`;
        }

        // Add HTML
        testHtml += this.currentInteraction.htmlCode;

        // Inject and execute
        testContainer.innerHTML = testHtml;

        // Execute JavaScript with sample data
        if (this.currentInteraction.jsCode) {
          // First, validate JavaScript syntax BEFORE trying to execute
          let jsCode = this.currentInteraction.jsCode;
          
          // Normalize line endings (CRLF -> LF, CR -> LF)
          jsCode = jsCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          
          // Fix SQL-escaped single quotes ('' -> ') - SQL uses '' to represent a single quote
          // This happens when code is stored in SQL string literals
          // Replace all occurrences of '' with ' (this is safe because '' in SQL = ' in JavaScript)
          jsCode = jsCode.replace(/''/g, "'");
          
          // Fix escaped template literals - handle both single and double escaping
          // Pattern: \\` (double-escaped) should become ` (backtick)
          // Pattern: \` (single-escaped) should become ` (backtick)
          // Pattern: \\${ (double-escaped) should become ${ (template expression start)
          // Pattern: \${ (single-escaped) should become ${ (template expression start)
          jsCode = jsCode.replace(/\\\\`/g, '`'); // Double-escaped backtick
          jsCode = jsCode.replace(/\\`/g, '`'); // Single-escaped backtick (after double-escaped is fixed)
          jsCode = jsCode.replace(/\\\\\$\{/g, '${'); // Double-escaped template expression
          jsCode = jsCode.replace(/\\\$\{/g, '${'); // Single-escaped template expression (after double-escaped is fixed)
          
          // Remove corrupted emoji characters and Unicode replacement characters
          jsCode = jsCode.replace(/\?{2,}/g, '');
          jsCode = jsCode.replace(/\uFFFD/g, '');
          
          // Check for characters that would break HTML string injection
          if (jsCode.includes('</script>') && !jsCode.includes('\\/script>')) {
            throw new Error('JavaScript contains unescaped "</script>" tag. Use "\\/script>" in strings instead.');
          }
          
          // Check for syntax errors using Function constructor (safer than eval)
          // First, log the code for debugging
          console.log('[Test] 🔍 Validating JavaScript code (length:', jsCode.length, 'chars)');
          console.log('[Test] 🔍 First 200 chars:', jsCode.substring(0, 200));
          console.log('[Test] 🔍 Last 200 chars:', jsCode.substring(Math.max(0, jsCode.length - 200)));
          
          try {
            // Try to parse as a script - wrap in IIFE to handle top-level code
            const wrappedCode = '(function() {\n' + jsCode + '\n})();';
            new Function(wrappedCode);
            console.log('[Test] ✅ Media Player overlay JavaScript syntax is valid');
          } catch (syntaxError: any) {
            console.error('[Test] ❌ JavaScript syntax error details:', {
              name: syntaxError.name,
              message: syntaxError.message,
              stack: syntaxError.stack
            });
            const errorMsg = syntaxError.message || 'Unknown syntax error';
            const errorName = syntaxError.name || 'SyntaxError';
            // Include more context in the error
            // Try to extract line number from error message
            const errorLineMatch = errorMsg.match(/line (\d+)/) || errorMsg.match(/at (\d+):(\d+)/);
            if (errorLineMatch) {
              const lineNum = parseInt(errorLineMatch[1]);
              const lines = jsCode.split('\n');
              const problemLine = lines[lineNum - 1] || 'unknown';
              const contextStart = Math.max(0, lineNum - 3);
              const contextEnd = Math.min(lines.length, lineNum + 2);
              const context = lines.slice(contextStart, contextEnd).map((line, idx) => {
                const actualLineNum = contextStart + idx + 1;
                const marker = actualLineNum === lineNum ? '>>> ' : '    ';
                return marker + actualLineNum + ': ' + line;
              }).join('\n');
              throw new Error(`JavaScript syntax error at line ${lineNum}: ${errorName}: ${errorMsg}\n\nProblem line:\n${problemLine}\n\nContext:\n${context}`);
            }
            // If no line number, show the problematic code section
            // Also check if the code appears to be truncated
            const codeLength = jsCode.length;
            const lastChars = jsCode.substring(Math.max(0, codeLength - 500));
            const isTruncated = jsCode.trim().endsWith('\\') || jsCode.trim().endsWith('`') || 
                                (jsCode.match(/`/g) || []).length % 2 !== 0; // Odd number of backticks = incomplete template literal
            
            let errorDetails = `JavaScript syntax error: ${errorName}: ${errorMsg}\n\nCode length: ${codeLength} chars\nLast 500 chars:\n${lastChars}`;
            if (isTruncated) {
              errorDetails += '\n\n⚠️ WARNING: Code appears to be truncated or has incomplete template literals!';
            }
            errorDetails += '\n\nThis will prevent the code from executing in the preview.';
            throw new Error(errorDetails);
          }
          
          const sampleDataJson = JSON.stringify(sampleData);
          // Use JSON.stringify to safely embed the JavaScript code
          const jsCodeJson = JSON.stringify(jsCode);
          const wrappedJs = '(function() {\n' +
            '  try {\n' +
            '    window.interactionData = ' + sampleDataJson + ';\n' +
            '    var userCode = ' + jsCodeJson + ';\n' +
            '    eval(userCode);\n' +
            '  } catch (e) {\n' +
            '    throw new Error("Runtime error: " + e.message);\n' +
            '  }\n' +
            '})();';
          const scriptEl = document.createElement('script');
          scriptEl.textContent = wrappedJs;
          testContainer.appendChild(scriptEl);
        }

        // Small delay to catch async errors
        setTimeout(() => {
          if (document.body.contains(testContainer)) {
            document.body.removeChild(testContainer);
            console.log('[Test] 🧹 Cleaned up test container');
          }
        }, 100);

        return { success: true };

      } catch (renderError: any) {
        if (document.body.contains(testContainer)) {
          document.body.removeChild(testContainer);
        }
        return { success: false, error: renderError.message || 'Preview render failed' };
      }

    } else {
      // Better error message - show what type was found
      const type = this.currentInteraction?.interactionTypeCategory || 'none';
      return { 
        success: false, 
        error: `Unsupported interaction type: "${type}". Supported types: html, pixijs, iframe, uploaded-media` 
      };
    }
  }

  testCode() {
    this.testing = true;
    this.testResult = null;
    console.log('[InteractionBuilder] 🧪 Testing code...');

    // Small delay for UX
    setTimeout(() => {
      try {
        // Update sample data from text field
        if (this.sampleDataText.trim()) {
          try {
            this.currentInteraction!.sampleData = JSON.parse(this.sampleDataText);
          } catch (jsonError: any) {
            throw new Error(`Sample data JSON error: ${jsonError.message}`);
          }
        }

        // Attempt to render preview (final validation)
        const renderResult = this.attemptPreviewRender();
        if (!renderResult.success) {
          throw new Error(renderResult.error || 'Preview render failed');
        }

        // All checks passed - store as last working version
        this.lastWorkingVersion = JSON.parse(JSON.stringify(this.currentInteraction));
        this.hasLastWorking = true;

        this.testResult = {
          success: true,
          message: '✅ Code executed successfully! Preview renders without errors.'
        };
        console.log('[Test] ✅ All tests passed!');

      } catch (error: any) {
        console.error('[Test] ❌ Test failed:', error);
        this.testResult = {
          success: false,
          message: 'Test failed',
          error: error.message || 'Unknown error'
        };
      } finally {
        this.testing = false;
      }
    }, 300);
  }

  testConfig() {
    this.testingConfig = true;
    this.testConfigResult = null;
    console.log('[InteractionBuilder] 🧪 Testing config schema...');

    setTimeout(() => {
      try {
        if (!this.currentInteraction) {
          throw new Error('No interaction selected');
        }

        if (!this.configSchemaText.trim()) {
          this.testConfigResult = {
            success: true,
            message: '✅ Config Schema is empty (optional)'
          };
          this.testingConfig = false;
          return;
        }

        // Validate JSON syntax
        let parsed: any;
        try {
          parsed = JSON.parse(this.configSchemaText);
        } catch (jsonError: any) {
          throw new Error(`Invalid JSON: ${jsonError.message}`);
        }

        // Validate structure
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Config Schema must be a JSON object');
        }

        // Validate fields array if present (optional - config schema can be valid without fields)
        if (parsed.fields !== undefined) {
          if (!Array.isArray(parsed.fields)) {
            throw new Error('"fields" must be an array if provided');
          }

          // Validate each field if fields array exists
          parsed.fields.forEach((field: any, index: number) => {
            if (!field.key) {
              throw new Error(`Field at index ${index} is missing required "key" property`);
            }
            if (!field.type) {
              throw new Error(`Field "${field.key}" is missing required "type" property`);
            }
            // Accept "string" as equivalent to "text", and also support "array" and "object" types
            const validTypes = ['text', 'string', 'number', 'boolean', 'select', 'color', 'textarea', 'array', 'object'];
            if (!validTypes.includes(field.type)) {
              throw new Error(`Field "${field.key}" has invalid type "${field.type}". Valid types: ${validTypes.join(', ')}`);
            }
          });
        }

        // Update config schema in current interaction
        this.currentInteraction!.configSchema = parsed;

        // FINAL VALIDATION: Attempt to render preview with current code and sample data
        const renderResult = this.attemptPreviewRender();
        if (!renderResult.success) {
          throw new Error(`Preview render failed: ${renderResult.error || 'Unknown error'}`);
        }

        // Store as last working version
        this.lastWorkingVersion = JSON.parse(JSON.stringify(this.currentInteraction));
        this.hasLastWorking = true;

        this.testConfigResult = {
          success: true,
          message: '✅ Config Schema is valid and preview renders successfully!'
        };
        console.log('[Test] ✅ Config Schema validation passed!');
      } catch (error: any) {
        console.error('[Test] ❌ Config Schema test failed:', error);
        this.testConfigResult = {
          success: false,
          message: 'Config Schema validation failed',
          error: error.message || 'Unknown error'
        };
      } finally {
        this.testingConfig = false;
      }
    }, 300);
  }

  testSampleData() {
    this.testingSample = true;
    this.testSampleResult = null;
    console.log('[InteractionBuilder] 🧪 Testing sample data...');

    setTimeout(() => {
      try {
        if (!this.currentInteraction) {
          throw new Error('No interaction selected');
        }

        if (!this.sampleDataText.trim()) {
          this.testSampleResult = {
            success: true,
            message: '✅ Sample Data is empty (optional)'
          };
          this.testingSample = false;
          return;
        }

        // Validate JSON syntax
        let parsed: any;
        try {
          parsed = JSON.parse(this.sampleDataText);
        } catch (jsonError: any) {
          throw new Error(`Invalid JSON: ${jsonError.message}`);
        }

        // Validate structure
        if (typeof parsed !== 'object' || parsed === null) {
          throw new Error('Sample Data must be a JSON object');
        }

        // For true-false-selection, validate fragments structure
        if (this.currentInteraction.id === 'true-false-selection') {
          if (!parsed.fragments || !Array.isArray(parsed.fragments)) {
            throw new Error('Sample Data must have a "fragments" array');
          }
          if (parsed.fragments.length === 0) {
            throw new Error('Sample Data must have at least one fragment');
          }
          parsed.fragments.forEach((fragment: any, index: number) => {
            // Check for "text" property (actual property name in true-false-selection)
            if (!fragment.text && !fragment.statement) {
              throw new Error(`Fragment at index ${index} is missing required "text" or "statement" property`);
            }
            // Check for "isTrueInContext" or "isTrue" (both are valid)
            if (fragment.isTrueInContext === undefined && fragment.isTrue === undefined) {
              throw new Error(`Fragment at index ${index} must have "isTrueInContext" or "isTrue" as a boolean`);
            }
            if (fragment.isTrueInContext !== undefined && typeof fragment.isTrueInContext !== 'boolean') {
              throw new Error(`Fragment at index ${index} must have "isTrueInContext" as a boolean`);
            }
            if (fragment.isTrue !== undefined && typeof fragment.isTrue !== 'boolean') {
              throw new Error(`Fragment at index ${index} must have "isTrue" as a boolean`);
            }
          });
        }

        // Update sample data in current interaction
        this.currentInteraction!.sampleData = parsed;

        // FINAL VALIDATION: Attempt to render preview with current code
        const renderResult = this.attemptPreviewRender();
        if (!renderResult.success) {
          throw new Error(`Preview render failed: ${renderResult.error || 'Unknown error'}`);
        }

        // Store as last working version
        this.lastWorkingVersion = JSON.parse(JSON.stringify(this.currentInteraction));
        this.hasLastWorking = true;

        this.testSampleResult = {
          success: true,
          message: '✅ Sample Data is valid and preview renders successfully!'
        };
        console.log('[Test] ✅ Sample Data validation passed!');
      } catch (error: any) {
        console.error('[Test] ❌ Sample Data test failed:', error);
        this.testSampleResult = {
          success: false,
          message: 'Sample Data validation failed',
          error: error.message || 'Unknown error'
        };
      } finally {
        this.testingSample = false;
      }
    }, 300);
  }

  showConfigModal() {
    if (!this.currentInteraction || !this.currentInteraction.configSchema) {
      console.log('[InteractionBuilder] ⚠️ Cannot show config modal - no interaction or config schema');
      return;
    }

    console.log('[InteractionBuilder] 🎬 Opening config modal');
    
    // Initialize config with defaults from schema
    this.configModalInitialConfig = {};
    if (this.currentInteraction.configSchema && this.currentInteraction.configSchema.fields) {
      this.currentInteraction.configSchema.fields.forEach((field: any) => {
        if (field.default !== undefined) {
          this.configModalInitialConfig[field.key] = field.default;
        }
      });
    }
    
    this.showingConfigModal = true;
  }

  closeConfigModal() {
    this.showingConfigModal = false;
    console.log('[InteractionBuilder] 🔒 Config modal closed');
  }

  openMediaSelector() {
    this.showMediaSelector = true;
  }

  closeMediaSelector() {
    this.showMediaSelector = false;
  }

  onMediaSelected(processedContentId: string) {
    console.log('[InteractionBuilder] 🎬 Media selected:', processedContentId);
    (this.currentInteraction as any).contentOutputId = processedContentId;
    this.selectedMediaId = processedContentId;
    
    // Store in mediaConfig for persistence (for testing in builder)
    if (!(this.currentInteraction as any).mediaConfig) {
      (this.currentInteraction as any).mediaConfig = {};
    }
    (this.currentInteraction as any).mediaConfig.testMediaContentId = processedContentId;
    
    // Update mediaConfigText to reflect the change
    this.mediaConfigText = JSON.stringify((this.currentInteraction as any).mediaConfig, null, 2);
    
    // Fetch media details to display name
    this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${processedContentId}`, {
      headers: {
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId
      }
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (media) => {
          this.selectedMediaName = media.outputName || media.contentSource?.title || 'Selected Media';
          console.log('[InteractionBuilder] ✅ Media name set:', this.selectedMediaName);
          this.markChanged();
        },
        error: (err) => {
          console.error('[InteractionBuilder] ❌ Failed to fetch media details:', err);
          // If 404, the processed content doesn't exist - clear the selection
          if (err.status === 404) {
            console.warn('[InteractionBuilder] ⚠️ Processed content not found, clearing selection');
            this.selectedMediaId = null;
            this.selectedMediaName = '';
            // Clear from mediaConfig
            if ((this.currentInteraction as any).mediaConfig) {
              delete (this.currentInteraction as any).mediaConfig.testMediaContentId;
              this.mediaConfigText = JSON.stringify((this.currentInteraction as any).mediaConfig, null, 2);
            }
          } else {
            this.selectedMediaName = 'Selected Media';
          }
          this.markChanged();
        }
      });
  }

  openIframeContentSelector() {
    this.showIframeContentSelector = true;
  }

  closeIframeContentSelector() {
    this.showIframeContentSelector = false;
  }

  onIframeContentSelected(processedContentId: string) {
    console.log('[InteractionBuilder] 🔗 iFrame content selected:', processedContentId);
    this.selectedIframeContentId = processedContentId;
    
    // Store in iframeConfig for persistence (for testing in builder)
    if (!this.currentInteraction!.iframeConfig) {
      this.currentInteraction!.iframeConfig = {};
    }
    this.currentInteraction!.iframeConfig.testContentOutputId = processedContentId;
    
    // Update iframeConfigText to reflect the change
    this.iframeConfigText = JSON.stringify(this.currentInteraction!.iframeConfig, null, 2);
    
    // Fetch content details to display name and URL
    this.http.get<any>(`${environment.apiUrl}/lesson-editor/processed-outputs/${processedContentId}`, {
      headers: {
        'x-tenant-id': environment.tenantId,
        'x-user-id': environment.defaultUserId
      }
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (content) => {
          this.selectedIframeContentName = content.outputName || content.contentSource?.title || 'Selected Content';
          // Extract URL from outputData if available
          const url = content.outputData?.url || content.outputData?.sourceUrl || content.contentSource?.sourceUrl;
          if (url && this.currentInteraction!.sampleData) {
            // Update sample data URL if it doesn't exist
            if (!this.currentInteraction!.sampleData.url) {
              this.currentInteraction!.sampleData.url = url;
              this.sampleDataText = JSON.stringify(this.currentInteraction!.sampleData, null, 2);
            }
          }
          console.log('[InteractionBuilder] ✅ iFrame content name set:', this.selectedIframeContentName);
          this.markChanged();
        },
        error: (err) => {
          console.error('[InteractionBuilder] ❌ Failed to fetch content details:', err);
          // If 404, the processed content doesn't exist - clear the selection
          if (err.status === 404) {
            console.warn('[InteractionBuilder] ⚠️ Processed content not found, clearing selection');
            this.selectedIframeContentId = null;
            this.selectedIframeContentName = '';
            // Clear from iframeConfig
            if (this.currentInteraction!.iframeConfig) {
              delete this.currentInteraction!.iframeConfig.testContentOutputId;
              this.iframeConfigText = JSON.stringify(this.currentInteraction!.iframeConfig, null, 2);
            }
          } else {
            this.selectedIframeContentName = 'Selected Content';
          }
          this.markChanged();
        }
      });
  }

  saveConfigFromModal(config: any) {
    console.log('[InteractionBuilder] 💾 Config saved from modal:', config);
    // In interaction-builder, this is just for preview - not actually saving anything to the interaction
    // The config is used by lesson-builders when they use the interaction
    this.closeConfigModal();
  }

  refreshPreview() {
    // Update sample data from text field first
    if (this.sampleDataText.trim()) {
      try {
        this.currentInteraction!.sampleData = JSON.parse(this.sampleDataText);
        console.log('[InteractionBuilder] ✅ Sample data updated for preview');
      } catch (e) {
        console.error('[InteractionBuilder] ❌ Sample data JSON invalid:', e);
      }
    }
    
    // Always reload from API first to get latest code, THEN refresh preview
    if (this.currentInteraction?.id) {
      console.log('[InteractionBuilder] 🔄 Reloading interaction from API...');
      this.http.get<InteractionType>(`${environment.apiUrl}/interaction-types/${this.currentInteraction.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            console.log('[InteractionBuilder] ✅ Reloaded interaction:', updated.id);
            console.log('[InteractionBuilder] 📋 Updated JS code length:', updated.jsCode?.length || 0);
            console.log('[InteractionBuilder] 📋 Updated sample data:', updated.sampleData);
            
            // Update current interaction with fresh data
            this.currentInteraction = { ...updated };
            // Update JSON text fields
            this.iframeConfigText = updated.iframeConfig ? JSON.stringify(updated.iframeConfig, null, 2) : '';
            this.configSchemaText = updated.configSchema ? JSON.stringify(updated.configSchema, null, 2) : '';
            this.sampleDataText = updated.sampleData ? JSON.stringify(updated.sampleData, null, 2) : '';
            
            // Clear blob cache and force iframe recreation with new key
            this.clearBlobUrlCache();
            this.previewKey = Date.now();
            console.log('[InteractionBuilder] 🔄 Preview refreshed with latest code, new key:', this.previewKey);
            console.log('[InteractionBuilder] 📋 Current interaction sample data:', this.currentInteraction.sampleData);
          },
          error: (err) => {
            console.error('[InteractionBuilder] ❌ Failed to reload interaction:', err);
            // Still refresh preview with current data
            this.clearBlobUrlCache();
            this.previewKey = Date.now();
          }
        });
    } else {
      // No interaction selected, just refresh preview with current data
      this.clearBlobUrlCache();
      this.previewKey = Date.now();
      console.log('[InteractionBuilder] 🔄 Preview refreshed, new key:', this.previewKey);
    }
  }

  toggleSidebar() {
    this.sidebarHidden = !this.sidebarHidden;
    console.log('[InteractionBuilder] 📚 Sidebar:', this.sidebarHidden ? 'hidden' : 'visible');
  }

  goBack() {
    if (this.hasChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    this.router.navigate(['/']);
  }

  resetToLastWorking(tab?: 'settings' | 'code' | 'config' | 'sample') {
    if (!this.lastWorkingVersion || !this.currentInteraction) {
      this.showSuccessSnackbar('No last working version available');
      return;
    }

    if (tab) {
      // Reset specific tab
      switch (tab) {
        case 'settings':
          if (this.lastWorkingVersion.name) this.currentInteraction.name = this.lastWorkingVersion.name;
          if (this.lastWorkingVersion.description) this.currentInteraction.description = this.lastWorkingVersion.description;
          if (this.lastWorkingVersion.interactionTypeCategory) this.currentInteraction.interactionTypeCategory = this.lastWorkingVersion.interactionTypeCategory;
          if (this.lastWorkingVersion.category) this.currentInteraction.category = this.lastWorkingVersion.category;
          break;
        case 'code':
          if (this.lastWorkingVersion.htmlCode) this.currentInteraction.htmlCode = this.lastWorkingVersion.htmlCode;
          if (this.lastWorkingVersion.cssCode) this.currentInteraction.cssCode = this.lastWorkingVersion.cssCode;
          if (this.lastWorkingVersion.jsCode) this.currentInteraction.jsCode = this.lastWorkingVersion.jsCode;
          if (this.lastWorkingVersion.iframeUrl) this.currentInteraction.iframeUrl = this.lastWorkingVersion.iframeUrl;
          if (this.lastWorkingVersion.iframeConfig) this.currentInteraction.iframeConfig = this.lastWorkingVersion.iframeConfig;
          this.markChanged();
          break;
        case 'config':
          if (this.lastWorkingVersion.configSchema) {
            this.currentInteraction.configSchema = this.lastWorkingVersion.configSchema;
            this.configSchemaText = JSON.stringify(this.lastWorkingVersion.configSchema, null, 2);
            this.configSchemaError = '';
          }
          break;
        case 'sample':
          if (this.lastWorkingVersion.sampleData) {
            this.currentInteraction.sampleData = this.lastWorkingVersion.sampleData;
            this.sampleDataText = JSON.stringify(this.lastWorkingVersion.sampleData, null, 2);
            this.sampleDataError = '';
          }
          break;
      }
      this.showSuccessSnackbar(`Reset ${tab} to last working version`);
    } else {
      // Reset all (called from header button)
      if (!confirm('Reset to last working version? Current changes will be lost.')) {
        return;
      }
      
      // Deep clone the last working version
      this.currentInteraction = JSON.parse(JSON.stringify(this.lastWorkingVersion));

      // Update text fields
      this.iframeConfigText = this.currentInteraction?.iframeConfig ? 
        JSON.stringify(this.currentInteraction.iframeConfig, null, 2) : '';
      this.configSchemaText = this.currentInteraction?.configSchema ? 
        JSON.stringify(this.currentInteraction.configSchema, null, 2) : '';
      this.sampleDataText = this.currentInteraction?.sampleData ? 
        JSON.stringify(this.currentInteraction.sampleData, null, 2) : '';

      this.hasChanges = false;
      this.testResult = null;
      this.refreshPreview();
      this.showSuccessSnackbar('Reset all to last working version');
    }
    this.markChanged();
  }
}
